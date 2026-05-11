import Prescription from "../models/Prescription.js";
import {
  ensureDrugByDescriptor,
  ensurePatientByDescriptor,
  ensurePrescriberByDescriptor,
  getPrescriptionStatusId,
} from "./schemaCompatService.js";

export const normalizeFhirBaseUrl = (baseUrl) =>
  String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");

const extractMedicationDisplay = (resource) => {
  const medication = resource.medicationCodeableConcept;
  if (medication?.text) {
    return medication.text;
  }

  const coding = medication?.coding?.[0];
  return coding?.display || coding?.code || resource.medicationReference?.reference || "Medication";
};

const extractQuantity = (resource) => {
  const value = Number(resource?.dispenseRequest?.quantity?.value);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
};

const mapFhirStatus = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "completed") {
    return "ready";
  }
  if (normalized === "cancelled" || normalized === "entered-in-error" || normalized === "stopped") {
    return "cancelled";
  }
  return "new";
};

export const syncMedicationRequestsFromFhir = async ({
  baseUrl,
  maxCount = 25,
} = {}) => {
  const normalizedBase = normalizeFhirBaseUrl(
    baseUrl || process.env.FHIR_BASE_URL || "https://hapi.fhir.org/baseR4",
  );

  if (!normalizedBase) {
    throw new Error("FHIR base URL is not configured.");
  }

  const safeCount = Math.min(Math.max(Number(maxCount) || 25, 1), 100);
  const url = new URL(`${normalizedBase}/MedicationRequest`);
  url.searchParams.set("_count", String(safeCount));
  url.searchParams.set("_sort", "-_lastUpdated");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/fhir+json, application/json" },
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("FHIR server returned invalid JSON.");
  }

  if (!response.ok) {
    const message =
      payload?.issue?.[0]?.diagnostics ||
      payload?.message ||
      `FHIR request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (payload?.resourceType !== "Bundle") {
    throw new Error("Unexpected FHIR response: expected a Bundle.");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of payload.entry || []) {
    const resource = entry?.resource;
    if (!resource?.id || resource.resourceType !== "MedicationRequest") {
      skipped += 1;
      continue;
    }

    const medicationDisplay = extractMedicationDisplay(resource);
    const prescriptionStatus = mapFhirStatus(resource.status);
    const statusId = await getPrescriptionStatusId(prescriptionStatus);
    const drugId = await ensureDrugByDescriptor({
      ndcCode: resource.medicationCodeableConcept?.coding?.[0]?.code || null,
      brandName: medicationDisplay,
      genericName: medicationDisplay,
      dosageForm: resource.medicationCodeableConcept?.coding?.[0]?.display || null,
      route: resource?.dosageInstruction?.[0]?.route?.text || null,
    });
    const prescriberId = await ensurePrescriberByDescriptor({
      npi: resource.requester?.identifier?.value || null,
      name: resource.requester?.display || resource.requester?.reference || "FHIR Prescriber",
      email: null,
    });
    const patientId = await ensurePatientByDescriptor({
      firstName: "FHIR",
      lastName: "Patient",
      dob: "1970-01-01",
    });

    const existing = await Prescription.findOne({
      where: {
        patientId,
        prescriberId,
        drugId,
      },
      order: [["created_at", "DESC"]],
    });

    const payloadToSave = {
      patientId,
      prescriberId,
      drugId,
      status: prescriptionStatus,
      statusId,
      quantity: extractQuantity(resource),
      enteredById: 1,
      verifiedById: null,
      insuranceId: null,
    };

    if (existing) {
      await existing.update(payloadToSave);
      updated += 1;
    } else {
      await Prescription.create(payloadToSave);
      created += 1;
    }
  }

  return {
    created,
    updated,
    skipped,
    fetched: (payload.entry || []).length,
    fhirRequestUrl: url.toString(),
  };
};
