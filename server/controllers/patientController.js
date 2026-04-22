import { Op } from "sequelize";
import Patient from "../models/Patient.js";
import PatientAuditLog from "../models/PatientAudit.js";
import PatientInsurance from "../models/PatientInsurance.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

const toOffset = (page = 1, limit = 25) =>
  (Math.max(Number(page), 1) - 1) * limit;

const PATIENT_NUMBER_PREFIX = "PT";

const generatePatientNumber = async () => {
  const latestPatient = await Patient.findOne({
    where: {
      patientNumber: {
        [Op.iLike]: `${PATIENT_NUMBER_PREFIX}%`,
      },
    },
    order: [["createdat", "DESC"]],
  });

  const latestNumber = latestPatient?.patientNumber || "";
  const numericPortion = Number(
    String(latestNumber).replace(
      new RegExp(`^${PATIENT_NUMBER_PREFIX}`, "i"),
      "",
    ),
  );
  const nextNumber = Number.isFinite(numericPortion) ? numericPortion + 1 : 1;

  return `${PATIENT_NUMBER_PREFIX}${String(nextNumber).padStart(6, "0")}`;
};

/**
 * Log audit entry for field change
 */
const logAuditEntry = async (
  patientId,
  fieldName,
  oldValue,
  newValue,
  changedByUserId,
) => {
  try {
    await PatientAuditLog.create({
      patientId,
      fieldName,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: newValue != null ? String(newValue) : null,
      changedByUserId,
    });
  } catch (error) {
    console.error("Audit logging error:", error);
  }
};

/**
 * Search patients
 * Query params: q (search term), page, limit
 */
export const searchPatients = async (req, res) => {
  try {
    const { q: searchTerm = "", page = 1 } = req.query;
    const limit = toLimit(req.query.limit, 25, 100);
    const offset = toOffset(page, limit);

    const whereClause = searchTerm
      ? {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${searchTerm}%` } },
            { lastName: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            { phonePrimary: { [Op.iLike]: `%${searchTerm}%` } },
            { patientNumber: { [Op.iLike]: `%${searchTerm}%` } },
            { mrn: { [Op.iLike]: `%${searchTerm}%` } },
          ],
        }
      : {};

    const { count, rows } = await Patient.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdat", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to search patients.",
    });
  }
};

/**
 * Get patient by ID
 */
export const getPatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get patient.",
    });
  }
};

/**
 * Create a new patient
 */
export const createPatient = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      email,
      phonePrimary,
      phoneSecondary,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      mrn,
      notes,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !phonePrimary ||
      !addressLine1 ||
      !city ||
      !state ||
      !zipCode ||
      !dateOfBirth
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: firstName, lastName, dateOfBirth, phonePrimary, addressLine1, city, state, zipCode.",
      });
    }

    const patientNumber = await generatePatientNumber();

    const patient = await Patient.create({
      firstName,
      lastName,
      middleName,
      dateOfBirth,
      gender,
      email,
      phonePrimary,
      phoneSecondary,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      patientNumber,
      mrn,
      notes,
    });

    // Log creation as audit entries
    const fieldsToLog = [
      "firstName",
      "lastName",
      "middleName",
      "dateOfBirth",
      "gender",
      "email",
      "phonePrimary",
      "phoneSecondary",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "zipCode",
      "mrn",
      "notes",
    ];

    for (const field of fieldsToLog) {
      if (patient[field] != null) {
        await logAuditEntry(
          patient.id,
          field,
          null,
          patient[field],
          req.user?.id || null,
        );
      }
    }

    await writeAuditLog({
      entityType: "patient",
      entityId: patient.id,
      action: "created",
      summary: `Created patient ${patient.firstName} ${patient.lastName}.`,
      metadata: patient.toJSON(),
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Patient created successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create patient.",
    });
  }
};

/**
 * Update a patient
 */
export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    delete updates.patientNumber;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const oldValues = patient.toJSON();

    await patient.update(updates);

    // Log each field change
    for (const [field, newValue] of Object.entries(updates)) {
      if (oldValues[field] !== newValue) {
        await logAuditEntry(
          id,
          field,
          oldValues[field],
          newValue,
          req.user?.id || null,
        );
      }
    }

    await writeAuditLog({
      entityType: "patient",
      entityId: patient.id,
      action: "updated",
      summary: `Updated patient ${patient.firstName} ${patient.lastName}.`,
      metadata: {
        before: oldValues,
        after: patient.toJSON(),
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully.",
      data: patient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update patient.",
    });
  }
};

/**
 * Delete a patient
 */
export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const snapshot = patient.toJSON();
    await patient.destroy();

    await writeAuditLog({
      entityType: "patient",
      entityId: id,
      action: "deleted",
      summary: `Deleted patient ${snapshot.firstName} ${snapshot.lastName}.`,
      metadata: snapshot,
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Patient deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete patient.",
    });
  }
};

/**
 * Get patient audit logs
 */
export const getPatientAudits = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1 } = req.query;
    const limit = toLimit(req.query.limit, 25, 100);
    const offset = toOffset(page, limit);

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const { count, rows } = await PatientAuditLog.findAndCountAll({
      where: { patientId },
      limit,
      offset,
      order: [["createdat", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get patient audits.",
    });
  }
};

/**
 * List patient insurances
 */
export const listPatientInsurances = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const insurances = await PatientInsurance.findAll({
      where: { patient_id: id },
      order: [["createdat", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: insurances,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load patient insurance records.",
    });
  }
};

/**
 * Add patient insurance
 */
export const addPatientInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_name, member_id, bin_number, pcn_number } = req.body;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    if (!provider_name || !member_id) {
      return res.status(400).json({
        success: false,
        message: "provider_name and member_id are required.",
      });
    }

    const insurance = await PatientInsurance.create({
      patient_id: id,
      provider_name,
      member_id,
      bin_number: bin_number || null,
      pcn_number: pcn_number || null,
    });

    await writeAuditLog({
      entityType: "patient_insurance",
      entityId: insurance.insurance_id,
      action: "created",
      summary: `Added insurance ${insurance.provider_name} for patient ${patient.patientNumber}.`,
      metadata: {
        patientId: id,
        insurance: insurance.toJSON(),
      },
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Patient insurance added successfully.",
      data: insurance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add patient insurance.",
    });
  }
};

/**
 * Update patient insurance
 */
export const updatePatientInsurance = async (req, res) => {
  try {
    const { id, insuranceId } = req.params;
    const { provider_name, member_id, bin_number, pcn_number } = req.body;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const insurance = await PatientInsurance.findOne({
      where: {
        insurance_id: insuranceId,
        patient_id: id,
      },
    });

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: "Insurance record not found.",
      });
    }

    const updates = {};

    if (provider_name !== undefined) {
      updates.provider_name = provider_name;
    }

    if (member_id !== undefined) {
      updates.member_id = member_id;
    }

    if (bin_number !== undefined) {
      updates.bin_number = bin_number || null;
    }

    if (pcn_number !== undefined) {
      updates.pcn_number = pcn_number || null;
    }

    if (!updates.provider_name || !updates.member_id) {
      return res.status(400).json({
        success: false,
        message: "provider_name and member_id are required.",
      });
    }

    const before = insurance.toJSON();
    await insurance.update(updates);

    await writeAuditLog({
      entityType: "patient_insurance",
      entityId: insurance.insurance_id,
      action: "updated",
      summary: `Updated insurance ${insurance.provider_name} for patient ${patient.patientNumber}.`,
      metadata: {
        patientId: id,
        before,
        after: insurance.toJSON(),
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Patient insurance updated successfully.",
      data: insurance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update patient insurance.",
    });
  }
};

/**
 * Delete patient insurance
 */
export const deletePatientInsurance = async (req, res) => {
  try {
    const { id, insuranceId } = req.params;

    const patient = await Patient.findByPk(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    const insurance = await PatientInsurance.findOne({
      where: {
        insurance_id: insuranceId,
        patient_id: id,
      },
    });

    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: "Insurance record not found.",
      });
    }

    const snapshot = insurance.toJSON();
    await insurance.destroy();

    await writeAuditLog({
      entityType: "patient_insurance",
      entityId: insuranceId,
      action: "deleted",
      summary: `Deleted insurance ${snapshot.provider_name} for patient ${patient.patientNumber}.`,
      metadata: {
        patientId: id,
        insurance: snapshot,
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Patient insurance deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete patient insurance.",
    });
  }
};
