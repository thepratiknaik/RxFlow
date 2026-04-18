import Patient from "../models/Patient.js";
import Prescription from "../models/Prescription.js";
import {
  generatePrescriptionNumber,
  syncMedicationRequestsFromFhir,
} from "../services/fhirPrescriptionService.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

export const listPrescriptions = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 25, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const status = req.query?.status
      ? String(req.query.status).trim()
      : null;
    const source = req.query?.source
      ? String(req.query.source).trim()
      : null;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (source === "fhir" || source === "manual") {
      where.source = source;
    }

    const { rows, count } = await Prescription.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["createdat", "DESC"]],
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "patientNumber",
            "mrn",
          ],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
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
    const { id } = req.params;

    const prescription = await Prescription.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
        },
      ],
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: prescription,
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
    const {
      patientId,
      medicationDisplay,
      sig,
      quantityValue,
      quantityUnit,
      refillsAllowed,
      authoredOn,
      prescriberDisplay,
      notes,
      insuranceProviderName,
      insurancePolicyNumber,
      insuranceGroupId,
    } = req.body || {};

    if (!medicationDisplay || !String(medicationDisplay).trim()) {
      return res.status(400).json({
        success: false,
        message: "medicationDisplay is required.",
      });
    }

    if (patientId) {
      const patient = await Patient.findByPk(patientId);
      if (!patient) {
        return res.status(400).json({
          success: false,
          message: "Patient not found for patientId.",
        });
      }
    }

    const qty =
      quantityValue != null && quantityValue !== ""
        ? Number(quantityValue)
        : null;

    const prescriptionNumber = await generatePrescriptionNumber();

    const prescription = await Prescription.create({
      prescriptionNumber,
      status: "new",
      source: "manual",
      patientId: patientId || null,
      medicationDisplay: String(medicationDisplay).trim(),
      sig: sig ? String(sig).trim() : null,
      quantityValue: Number.isFinite(qty) ? qty : null,
      quantityUnit: quantityUnit ? String(quantityUnit).trim() : null,
      refillsAllowed:
        refillsAllowed != null && refillsAllowed !== ""
          ? Number(refillsAllowed)
          : null,
      authoredOn: authoredOn ? String(authoredOn).slice(0, 10) : null,
      prescriberDisplay: prescriberDisplay
        ? String(prescriberDisplay).trim()
        : null,
      notes: notes ? String(notes).trim() : null,
      insuranceProviderName: insuranceProviderName
        ? String(insuranceProviderName).trim()
        : null,
      insurancePolicyNumber: insurancePolicyNumber
        ? String(insurancePolicyNumber).trim()
        : null,
      insuranceGroupId: insuranceGroupId
        ? String(insuranceGroupId).trim()
        : null,
      etInApproved: false,
      etInApprovedAt: null,
      etInApprovedByUserId: null,
    });

    const withPatient = await Prescription.findByPk(prescription.id, {
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "patientNumber",
            "mrn",
          ],
          required: false,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Prescription created and placed in the New queue.",
      data: withPatient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create prescription.",
    });
  }
};

export const approvePrescriptionEtIn = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    if (prescription.status !== "new") {
      return res.status(400).json({
        success: false,
        message: "ET-In approval applies only to prescriptions in the New queue.",
      });
    }

    if (prescription.etInApproved) {
      return res.status(400).json({
        success: false,
        message: "This prescription already has ET-In approval recorded.",
      });
    }

    prescription.etInApproved = true;
    prescription.etInApprovedAt = new Date();
    prescription.etInApprovedByUserId = req.user.id;
    await prescription.save();

    const withPatient = await Prescription.findByPk(prescription.id, {
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "patientNumber",
            "mrn",
          ],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "ET-In approval recorded.",
      data: withPatient,
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
    const {
      insuranceProviderName,
      insurancePolicyNumber,
      insuranceGroupId,
    } = req.body || {};

    const prescription = await Prescription.findByPk(id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    const updates = {};

    if (insuranceProviderName !== undefined) {
      updates.insuranceProviderName = insuranceProviderName
        ? String(insuranceProviderName).trim()
        : null;
    }
    if (insurancePolicyNumber !== undefined) {
      updates.insurancePolicyNumber = insurancePolicyNumber
        ? String(insurancePolicyNumber).trim()
        : null;
    }
    if (insuranceGroupId !== undefined) {
      updates.insuranceGroupId = insuranceGroupId
        ? String(insuranceGroupId).trim()
        : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one of: insuranceProviderName, insurancePolicyNumber, insuranceGroupId.",
      });
    }

    await prescription.update(updates);
    await prescription.reload();

    return res.status(200).json({
      success: true,
      message: "Insurance information updated.",
      data: prescription,
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
    const status = error.status && Number.isInteger(error.status) ? error.status : 502;
    return res.status(status >= 400 && status < 600 ? status : 502).json({
      success: false,
      message: error.message || "Failed to sync prescriptions from FHIR.",
    });
  }
};
