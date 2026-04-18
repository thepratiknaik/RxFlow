import { Op } from "sequelize";
import Prescription from "../models/Prescription.js";

const RX_PREFIX = "RX";

export const normalizeFhirBaseUrl = (baseUrl) =>
  String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");

const extractMedicationDisplay = (resource) => {
  const mc = resource.medicationCodeableConcept;
  if (mc?.text) {
    return mc.text;
  }

  if (mc?.coding?.length) {
    const withDisplay = mc.coding.find((c) => c.display);
    return withDisplay?.display || mc.coding[0]?.code || null;
  }

  if (resource.medicationReference?.reference) {
    return resource.medicationReference.reference;
  }

  return null;
};

const extractMedicationCode = (resource) => {
  const mc = resource.medicationCodeableConcept;
  const code = mc?.coding?.[0];
  if (!code?.code) {
    return null;
  }

  const system = code.system ? `${code.system}|` : "";
  return `${system}${code.code}`;
};

const mapFhirClinicalStatusToWorkflow = (fhirStatus) => {
  const v = String(fhirStatus || "").toLowerCase();

  if (v === "cancelled" || v === "entered-in-error" || v === "stopped") {
    return "cancelled";
  }

  if (v === "completed") {
    return "ready";
  }

  return "new";
};

const buildSig = (resource) => {
  if (!Array.isArray(resource.dosageInstruction)) {
    return null;
  }

  const parts = resource.dosageInstruction
    .map((d) => d?.text)
    .filter(Boolean);

  return parts.length ? parts.join("; ") : null;
};

const extractInsuranceFromMedicationRequest = (resource) => {
  let insuranceProviderName = null;
  let insurancePolicyNumber = null;
  let insuranceGroupId = null;

  const contained = resource.contained || [];
  for (const c of contained) {
    if (c.resourceType !== "Coverage") {
      continue;
    }

    const payor = c.payor?.[0];
    insuranceProviderName =
      payor?.display ||
      payor?.reference ||
      c.payor?.[0]?.identifier?.value ||
      insuranceProviderName;

    const subscriberId = c.subscriberId;
    const idValue = c.identifier?.find((i) => i.value)?.value;
    insurancePolicyNumber = subscriberId || idValue || insurancePolicyNumber;

    const groupClass = (c.class || []).find((cl) =>
      cl.type?.coding?.some((co) => co.code === "group"),
    );
    if (groupClass) {
      insuranceGroupId = groupClass.value || groupClass.name || insuranceGroupId;
    }
  }

  for (const ext of resource.extension || []) {
    const url = String(ext.url || "").toLowerCase();
    const str = ext.valueString || ext.valueUri;
    if (!str) {
      continue;
    }

    if (url.includes("insurance") && url.includes("provider")) {
      insuranceProviderName = str;
    } else if (url.includes("policy") || url.includes("member")) {
      insurancePolicyNumber = str;
    } else if (url.includes("group")) {
      insuranceGroupId = str;
    }
  }

  return {
    insuranceProviderName,
    insurancePolicyNumber,
    insuranceGroupId,
  };
};

const extractQuantity = (resource) => {
  const dq = resource.dispenseRequest;
  const q = dq?.quantity;
  if (!q || q.value == null) {
    return { quantityValue: null, quantityUnit: null };
  }

  const value = Number(q.value);
  const unit = q.unit || q.code || null;

  return {
    quantityValue: Number.isFinite(value) ? value : null,
    quantityUnit: unit,
  };
};

export const mapMedicationRequestToPayload = (resource, fhirServerBaseUrl) => {
  if (!resource?.id || resource.resourceType !== "MedicationRequest") {
    return null;
  }

  const fhirStatus = resource.status || "unknown";
  const workflowStatus = mapFhirClinicalStatusToWorkflow(fhirStatus);
  const medicationDisplay =
    extractMedicationDisplay(resource) || "Medication (unspecified)";
  const { quantityValue, quantityUnit } = extractQuantity(resource);

  let prescriberDisplay = null;
  if (resource.requester?.display) {
    prescriberDisplay = resource.requester.display;
  } else if (resource.requester?.reference) {
    prescriberDisplay = resource.requester.reference;
  }

  const authoredOn = resource.authoredOn
    ? String(resource.authoredOn).slice(0, 10)
    : null;

  const fhirLastUpdated = resource.meta?.lastUpdated
    ? new Date(resource.meta.lastUpdated)
    : null;

  const insurance = extractInsuranceFromMedicationRequest(resource);

  return {
    source: "fhir",
    fhirServerBaseUrl,
    fhirResourceId: resource.id,
    fhirClinicalStatus: fhirStatus,
    fhirLastUpdated,
    fhirRaw: resource,
    externalSubjectRef: resource.subject?.reference || null,
    medicationDisplay,
    medicationCode: extractMedicationCode(resource),
    sig: buildSig(resource),
    quantityValue,
    quantityUnit,
    refillsAllowed:
      resource.dispenseRequest?.numberOfRepeatsAllowed != null
        ? Number(resource.dispenseRequest.numberOfRepeatsAllowed)
        : null,
    authoredOn,
    prescriberDisplay,
    status: workflowStatus,
    insuranceProviderName: insurance.insuranceProviderName,
    insurancePolicyNumber: insurance.insurancePolicyNumber,
    insuranceGroupId: insurance.insuranceGroupId,
    etInApproved: false,
  };
};

export const generatePrescriptionNumber = async () => {
  const latest = await Prescription.findOne({
    where: {
      prescriptionNumber: {
        [Op.iLike]: `${RX_PREFIX}%`,
      },
    },
    order: [["createdat", "DESC"]],
  });

  const latestNumber = latest?.prescriptionNumber || "";
  const numericPortion = Number(
    String(latestNumber).replace(new RegExp(`^${RX_PREFIX}`, "i"), ""),
  );
  const next = Number.isFinite(numericPortion) ? numericPortion + 1 : 1;

  return `${RX_PREFIX}${String(next).padStart(8, "0")}`;
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
    headers: {
      Accept: "application/fhir+json, application/json",
    },
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error("FHIR server returned invalid JSON.");
  }

  if (!response.ok) {
    const msg =
      payload?.issue?.[0]?.diagnostics ||
      payload?.message ||
      `FHIR request failed with status ${response.status}.`;
    const err = new Error(msg);
    err.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw err;
  }

  if (payload?.resourceType !== "Bundle") {
    throw new Error("Unexpected FHIR response: expected a Bundle.");
  }

  const entries = payload.entry || [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    const resource = entry?.resource;
    const mapped = mapMedicationRequestToPayload(resource, normalizedBase);

    if (!mapped) {
      skipped += 1;
      continue;
    }

    const existing = await Prescription.findOne({
      where: {
        fhirServerBaseUrl: normalizedBase,
        fhirResourceId: mapped.fhirResourceId,
      },
    });

    if (existing) {
      if (existing.status !== "new") {
        await existing.update({
          fhirLastUpdated: mapped.fhirLastUpdated,
          fhirRaw: mapped.fhirRaw,
          fhirClinicalStatus: mapped.fhirClinicalStatus,
        });
      } else {
        const patch = {
          ...mapped,
          prescriptionNumber: existing.prescriptionNumber,
        };

        if (existing.etInApproved) {
          patch.etInApproved = existing.etInApproved;
          patch.etInApprovedAt = existing.etInApprovedAt;
          patch.etInApprovedByUserId = existing.etInApprovedByUserId;
        }

        await existing.update(patch);
      }
      updated += 1;
    } else {
      const prescriptionNumber = await generatePrescriptionNumber();
      await Prescription.create({
        ...mapped,
        prescriptionNumber,
        patientId: null,
      });
      created += 1;
    }
  }

  return {
    created,
    updated,
    skipped,
    fetched: entries.length,
    fhirRequestUrl: url.toString(),
  };
};
