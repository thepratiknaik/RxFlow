import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { pullAndUpsertDrugs } from "./drugPullService.js";

const ROLE_LABELS = {
  admin: "Admin",
  pharmacist: "Pharmacist",
  technician: "Technician",
  user: "Technician",
};

const ROLE_LABELS_REVERSE = {
  admin: "admin",
  pharmacist: "pharmacist",
  technician: "technician",
};

const PRESCRIPTION_STATUS_LABELS = {
  new: "New",
  in_process: "In Process",
  ready: "Ready",
  picked_up: "Picked Up",
  cancelled: "Cancelled",
};

const PRESCRIPTION_STATUS_REVERSE = {
  new: "new",
  "in process": "in_process",
  ready: "ready",
  "picked up": "picked_up",
  cancelled: "cancelled",
  canceled: "cancelled",
};

const normalize = (value) => String(value || "").trim();

export const normalizeRole = (value) => {
  const normalized = normalize(value).toLowerCase();
  if (!normalized) {
    return "technician";
  }

  if (ROLE_LABELS[normalized]) {
    return normalized === "user" ? "technician" : normalized;
  }

  return ROLE_LABELS_REVERSE[normalized] || "technician";
};

export const getRoleLabel = (value) => ROLE_LABELS[normalizeRole(value)] || "Technician";

export const getRoleIdByName = async (value) => {
  const roleName = getRoleLabel(value);
  const row = await sequelize.query(
    `SELECT id FROM role WHERE lower(role_name) = lower(:roleName) LIMIT 1`,
    {
      replacements: { roleName },
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  return row?.id || null;
};

export const getRoleNameById = async (id) => {
  if (!id) {
    return "technician";
  }

  const row = await sequelize.query(
    `SELECT role_name FROM role WHERE id = :id LIMIT 1`,
    {
      replacements: { id },
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  return normalizeRole(row?.role_name);
};

export const normalizePrescriptionStatus = (value) => {
  const normalized = normalize(value).toLowerCase().replace(/[-_]+/g, " ");

  if (!normalized) {
    return "new";
  }

  return PRESCRIPTION_STATUS_REVERSE[normalized] || "new";
};

export const getPrescriptionStatusLabel = (value) =>
  PRESCRIPTION_STATUS_LABELS[normalizePrescriptionStatus(value)] || "New";

export const getPrescriptionStatusId = async (value) => {
  const statusLabel = getPrescriptionStatusLabel(value);
  const row = await sequelize.query(
    `SELECT id FROM prescription_status WHERE lower(status) = lower(:status) LIMIT 1`,
    {
      replacements: { status: statusLabel },
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  return row?.id || null;
};

export const getPrescriptionStatusNameById = async (id) => {
  if (!id) {
    return "new";
  }

  const row = await sequelize.query(
    `SELECT status FROM prescription_status WHERE id = :id LIMIT 1`,
    {
      replacements: { id },
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  return normalizePrescriptionStatus(row?.status);
};

export const getDefaultPharmacyId = async () => {
  const row = await sequelize.query(
    `SELECT pharmacy_id FROM pharmacy ORDER BY pharmacy_id ASC LIMIT 1`,
    {
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  return row?.pharmacy_id || null;
};

export const ensureDrugByDescriptor = async ({
  drugId = null,
  ndcCode = null,
  brandName = null,
  genericName = null,
  dosageForm = null,
  route = null,
} = {}) => {
  if (drugId) {
    return Number(drugId);
  }

  if (ndcCode) {
    const byNdc = await sequelize.query(
      `SELECT drug_id FROM drug WHERE ndc_code = :ndcCode LIMIT 1`,
      {
        replacements: { ndcCode: String(ndcCode).trim() },
        type: QueryTypes.SELECT,
        plain: true,
      },
    );

    if (byNdc?.drug_id) {
      return byNdc.drug_id;
    }
  }

  const normalizedBrand = normalize(brandName);
  const normalizedGeneric = normalize(genericName || brandName);
  const normalizedDosageForm = normalize(dosageForm);
  const normalizedRoute = normalize(route);

  const existing = await sequelize.query(
    `
      SELECT drug_id
      FROM drug
      WHERE lower(brand_name) = lower(:brandName)
         OR lower(generic_name) = lower(:genericName)
      LIMIT 1
    `,
    {
      replacements: {
        brandName: normalizedBrand,
        genericName: normalizedGeneric,
      },
      type: QueryTypes.SELECT,
      plain: true,
    },
  );

  if (existing?.drug_id) {
    return existing.drug_id;
  }

  // Not found locally — try pulling from FDA before inserting a placeholder
  const fdaSearchTerm = normalizedBrand || normalizedGeneric;
  if (fdaSearchTerm) {
    try {
      await pullAndUpsertDrugs({ searchTerm: fdaSearchTerm, limit: 5 });
      const afterFda = await sequelize.query(
        `SELECT drug_id FROM drug WHERE lower(brand_name) = lower(:brandName) OR lower(generic_name) = lower(:genericName) LIMIT 1`,
        { replacements: { brandName: normalizedBrand, genericName: normalizedGeneric }, type: QueryTypes.SELECT, plain: true },
      );
      if (afterFda?.drug_id) {
        return afterFda.drug_id;
      }
    } catch {
      // FDA unavailable — fall through to placeholder insert
    }
  }

  const inserted = await sequelize.query(
    `
      INSERT INTO drug (ndc_code, brand_name, generic_name, dosage_form, route, is_controlled)
      VALUES (:ndcCode, :brandName, :genericName, :dosageForm, :route, false)
      RETURNING drug_id
    `,
    {
      replacements: {
        ndcCode:
          normalize(ndcCode) || `TMP-${String(Date.now()).slice(-8).padStart(8, "0")}`,
        brandName: normalizedBrand || normalizedGeneric || "Unknown Drug",
        genericName: normalizedGeneric || normalizedBrand || "Unknown Drug",
        dosageForm: normalizedDosageForm || null,
        route: normalizedRoute || null,
      },
      type: QueryTypes.INSERT,
      plain: true,
    },
  );

  return inserted?.drug_id || inserted?.[0]?.drug_id || null;
};

export const ensurePrescriberByDescriptor = async ({
  prescriberId = null,
  npi = null,
  name = null,
  contact = null,
  email = null,
} = {}) => {
  if (prescriberId) {
    return Number(prescriberId);
  }

  const normalizedNpi = normalize(npi);
  const normalizedEmail = normalize(email).toLowerCase();
  if (normalizedNpi) {
    const existing = await sequelize.query(
      `SELECT prescriber_id FROM prescriber WHERE npi_number = :npi LIMIT 1`,
      {
        replacements: { npi: normalizedNpi },
        type: QueryTypes.SELECT,
        plain: true,
      },
    );

    if (existing?.prescriber_id) {
      return existing.prescriber_id;
    }
  }

  const parts = normalize(name).split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || "Unknown";
  const lastName = parts.join(" ") || "Prescriber";

  const inserted = await sequelize.query(
    `
      INSERT INTO prescriber (npi_number, first_name, last_name, contact_details, email)
      VALUES (:npi, :firstName, :lastName, :contact, :email)
      RETURNING prescriber_id
    `,
    {
      replacements: {
        npi: normalizedNpi || String(Date.now()).slice(-10).padStart(10, "1"),
        firstName,
        lastName,
        contact: normalize(contact) || null,
        email: normalizedEmail || null,
      },
      type: QueryTypes.INSERT,
      plain: true,
    },
  );

  return inserted?.prescriber_id || inserted?.[0]?.prescriber_id || null;
};

export const ensurePatientByDescriptor = async ({
  patientId = null,
  firstName = "Unknown",
  lastName = "Patient",
  dob = "1970-01-01",
} = {}) => {
  if (patientId) {
    return Number(patientId);
  }

  const pharmacyId = await getDefaultPharmacyId();
  const inserted = await sequelize.query(
    `
      INSERT INTO patient (pharmacy_id, first_name, last_name, dob)
      VALUES (:pharmacyId, :firstName, :lastName, :dob)
      RETURNING patient_id
    `,
    {
      replacements: {
        pharmacyId,
        firstName: normalize(firstName) || "Unknown",
        lastName: normalize(lastName) || "Patient",
        dob: String(dob || "1970-01-01").slice(0, 10),
      },
      type: QueryTypes.INSERT,
      plain: true,
    },
  );

  return inserted?.patient_id || inserted?.[0]?.patient_id || null;
};
