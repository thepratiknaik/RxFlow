import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import Prescriber from "../models/Prescriber.js";
import Drug from "../models/Drug.js";
import User from "../models/User.js";
import { syncMedicationRequestsFromFhir } from "../services/fhirPrescriptionService.js";
import {
  buildPrescriptionReviewSummary,
  getReviewStatus,
  listPrescriptionReviewRecords,
} from "../services/prescriptionNotificationService.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";
import {
  ensureDrugByDescriptor,
  ensurePatientByDescriptor,
  ensurePrescriberByDescriptor,
  getPrescriptionStatusId,
  normalizePrescriptionStatus,
} from "../services/schemaCompatService.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

const STATUS_MAP = {
  New: "new",
  "In Process": "in_process",
  Ready: "ready",
  "Picked Up": "picked_up",
  Cancelled: "cancelled",
};

const STATUS_MAP_REVERSE = {
  new: "New",
  in_process: "In Process",
  ready: "Ready",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

const hasClientProvidedPrescriptionId = (payload) =>
  ["id", "prescription_id", "prescriptionId"].some(
    (key) =>
      Object.prototype.hasOwnProperty.call(payload || {}, key) &&
      payload[key] != null &&
      String(payload[key]).trim() !== "",
  );

const loadPrescriptionWithPatient = async (id) =>
  await Prescription.findByPk(id, {
    include: [
      {
        model: Patient,
        as: "patient",
        required: false,
      },
    ],
  });

const serializePrescription = async (prescription) => {
  const plain = prescription.toJSON();
  const drug = await Drug.findByPk(prescription.drugId);
  const prescriber = await Prescriber.findByPk(prescription.prescriberId);
  const enteredBy = await User.findByPk(prescription.enteredById);
  const verifiedBy = prescription.verifiedById
    ? await User.findByPk(prescription.verifiedById)
    : null;
  const reviewRecords = await listPrescriptionReviewRecords(prescription.id);
  const reviewHistory = reviewRecords.map((record) => ({
    ...record,
    status: getReviewStatus(record),
  }));
  const latestReview = reviewHistory[0] || null;

  return {
    ...plain,
    prescriptionNumber: String(prescription.id),
    medicationDisplay:
      drug?.brandname || drug?.genericname || drug?.productndc || `Drug ${prescription.drugId}`,
    quantityValue: prescription.quantity,
    reviewHistory,
    latestReview,
    reviewSummary: buildPrescriptionReviewSummary(reviewRecords),
    fhirRaw: {
      pharmacy_id: prescription.pharmacyId,
      prescriber_id: prescriber?.npi || String(prescription.prescriberId),
      drug_name: [
        drug?.brandname || drug?.genericname || drug?.productndc || `Drug ${prescription.drugId}`,
      ],
      entered_by: enteredBy?.fullname || `User ${prescription.enteredById}`,
      verified_by: verifiedBy?.fullname || null,
    },
    source: "manual",
    createdat: prescription.created_at,
  };
};

const toPrescriptionEntryResponse = async (prescription) => {
  const drug = await Drug.findByPk(prescription.drugId);
  const prescriber = await Prescriber.findByPk(prescription.prescriberId);
  const enteredBy = await User.findByPk(prescription.enteredById);
  const verifiedBy = prescription.verifiedById
    ? await User.findByPk(prescription.verifiedById)
    : null;

  return {
    prescription_id: prescription.id,
    pharmacy_id: prescription.pharmacyId,
    patient_id: prescription.patientId,
    prescriber_id: prescriber?.npi || String(prescription.prescriberId),
    drug_name: [
      drug?.brandname || drug?.genericname || drug?.productndc || `Drug ${prescription.drugId}`,
    ],
    status: STATUS_MAP_REVERSE[prescription.status] || "New",
    quantity: prescription.quantity,
    entered_by: enteredBy?.fullname || `User ${prescription.enteredById}`,
    verified_by: verifiedBy?.fullname || null,
    created_at: prescription.created_at,
    source: "manual",
  };
};

export const listPrescriptions = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 25, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const status = req.query?.status ? String(req.query.status).trim() : null;

    const where = {};
    if (status) {
      where.statusId = await getPrescriptionStatusId(status);
    }

    const { rows, count } = await Prescription.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
        },
      ],
    });

    const data = await Promise.all(rows.map(serializePrescription));

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list prescriptions.",
    });
  }
};

export const getPrescription = async (req, res) => {
  try {
    const prescription = await loadPrescriptionWithPatient(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: await serializePrescription(prescription),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get prescription.",
    });
  }
};

export const createPrescriptionManual = async (req, res) => {
  try {
    if (hasClientProvidedPrescriptionId(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          "Do not provide prescription ID fields. The database assigns prescription IDs automatically.",
      });
    }

    const patientId = await ensurePatientByDescriptor({
      patientId: req.body?.patientId || null,
    });
    const prescriberId = await ensurePrescriberByDescriptor({
      npi: req.body?.prescriberDisplay || null,
      name: req.body?.prescriberDisplay || "Manual Prescriber",
    });
    const drugId = await ensureDrugByDescriptor({
      brandName: req.body?.medicationDisplay || "Manual Drug",
      genericName: req.body?.medicationDisplay || "Manual Drug",
    });

    const qty =
      req.body?.quantityValue != null && req.body.quantityValue !== ""
        ? Number(req.body.quantityValue)
        : 1;

    const prescription = await Prescription.create({
      patientId,
      prescriberId,
      drugId,
      insuranceId: null,
      status: "new",
      statusId: await getPrescriptionStatusId("new"),
      quantity: Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 1,
      enteredById: req.user?.id || 1,
      verifiedById: null,
    });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "created",
      summary: `Created prescription ${prescription.id}.`,
      metadata: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Prescription created and placed in the New queue.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create prescription.",
    });
  }
};

export const createPrescriptionEntry = async (req, res) => {
  try {
    if (hasClientProvidedPrescriptionId(req.body)) {
      return res.status(400).json({
        success: false,
        message:
          "Do not provide prescription ID fields. The database assigns prescription IDs automatically.",
      });
    }

    const {
      patient_id,
      prescriber_id,
      drug_name,
      status,
      quantity,
      verified_by,
    } = req.body || {};

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: "patient_id is required.",
      });
    }

    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(400).json({
        success: false,
        message: "Patient not found for patient_id.",
      });
    }

    const drugNameArray = Array.isArray(drug_name)
      ? drug_name.map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!drugNameArray.length) {
      return res.status(400).json({
        success: false,
        message: "drug_name must be a non-empty array of drug names.",
      });
    }

    const normalizedStatus = normalizePrescriptionStatus(
      STATUS_MAP[String(status || "New").trim()] || status || "new",
    );
    const normalizedQuantity = Number(quantity);

    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a positive number.",
      });
    }

    const prescriberRef = await ensurePrescriberByDescriptor({
      npi: prescriber_id || null,
      name: prescriber_id || "Prescription Prescriber",
    });
    const drugRef = await ensureDrugByDescriptor({
      brandName: drugNameArray[0],
      genericName: drugNameArray[0],
    });
    const statusId = await getPrescriptionStatusId(normalizedStatus);

    let verifiedById = null;
    if (verified_by) {
      const user = await User.findOne({ where: { email: verified_by } });
      verifiedById = user?.id || null;
    }

    const prescription = await Prescription.create({
      patientId: Number(patient_id),
      prescriberId: prescriberRef,
      drugId: drugRef,
      insuranceId: null,
      status: normalizedStatus,
      statusId,
      quantity: Math.round(normalizedQuantity),
      enteredById: req.user?.id || 1,
      verifiedById,
    });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "created",
      summary: `Created prescription ${prescription.id}.`,
      metadata: await toPrescriptionEntryResponse(prescription),
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Prescription entry created successfully.",
      data: await toPrescriptionEntryResponse(prescription),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create prescription entry.",
    });
  }
};

export const approvePrescriptionEtIn = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    if (prescription.status !== "new") {
      return res.status(400).json({
        success: false,
        message:
          "ET-In approval applies only to prescriptions in the New queue.",
      });
    }

    prescription.status = "in_process";
    prescription.verifiedById = req.user?.id || null;
    await prescription.save();

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "approved_et_in",
      summary: `Recorded ET-In approval for prescription ${prescription.id}.`,
      metadata: {
        prescriptionId: prescription.id,
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "ET-In approval recorded.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve prescription.",
    });
  }
};

export const patchPrescriptionInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    if (req.body?.insuranceId !== undefined) {
      prescription.insuranceId = req.body.insuranceId
        ? Number(req.body.insuranceId)
        : null;
      await prescription.save();
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide insuranceId to update prescription insurance.",
      });
    }

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "updated_insurance",
      summary: `Updated insurance details for prescription ${prescription.id}.`,
      metadata: { insuranceId: prescription.insuranceId },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Insurance information updated.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update insurance.",
    });
  }
};

export const syncFhirPrescriptions = async (req, res) => {
  try {
    const maxCount = toLimit(
      req.body?.maxCount ?? req.query?.maxCount,
      25,
      100,
    );
    const baseUrl = req.body?.fhirBaseUrl || req.query?.fhirBaseUrl;

    const summary = await syncMedicationRequestsFromFhir({
      baseUrl: baseUrl || undefined,
      maxCount,
    });

    return res.status(200).json({
      success: true,
      message: "FHIR MedicationRequest resources processed.",
      data: summary,
    });
  } catch (error) {
    const status =
      error.status && Number.isInteger(error.status) ? error.status : 502;
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: error.message || "Failed to sync prescriptions from FHIR.",
    });
  }
};
