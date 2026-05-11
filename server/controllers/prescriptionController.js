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
import { getLotsForDrug } from "../services/dispensingService.js";
import { Op } from "sequelize";
import { sequelize } from "../config/db.js";
import PrescriptionItem from "../models/PrescriptionItem.js";
import InventoryLot from "../models/InventoryLot.js";

// Associations (idempotent — safe to re-declare)
Prescription.hasMany(PrescriptionItem, { foreignKey: "prescriptionId", as: "items" });
PrescriptionItem.belongsTo(Drug, { foreignKey: "drugId", as: "drug" });
PrescriptionItem.belongsTo(InventoryLot, { foreignKey: "lotId", as: "lot" });

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
      { model: Patient, as: "patient", required: false },
      {
        model: PrescriptionItem,
        as: "items",
        required: false,
        include: [
          { model: Drug, as: "drug", required: false },
          { model: InventoryLot, as: "lot", required: false },
        ],
      },
    ],
  });

const serializeItems = (rawItems) =>
  (rawItems || []).map((item) => ({
    id: item.id,
    drugId: item.drugId,
    quantity: item.quantity,
    lotId: item.lotId || null,
    quantityBlocked: item.quantityBlocked || 0,
    drug: item.drug
      ? {
          id: item.drug.id,
          brandname: item.drug.brandname,
          genericname: item.drug.genericname,
          dosageform: item.drug.dosageform,
          route: item.drug.route,
          ndc: item.drug.productndc,
        }
      : null,
    lot: item.lot
      ? {
          id: item.lot.id,
          lotNumber: item.lot.lotNumber,
          expiryDate: item.lot.expiryDate,
          quantityOnHand: item.lot.quantityOnHand,
        }
      : null,
  }));

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

  const items = serializeItems(prescription.items);
  const drugNames = items.length
    ? items.map((i) => i.drug?.brandname || i.drug?.genericname || `Drug ${i.drugId}`)
    : [drug?.brandname || drug?.genericname || drug?.productndc || `Drug ${prescription.drugId}`];

  return {
    ...plain,
    prescriptionNumber: String(prescription.id),
    medicationDisplay: drugNames.join(", "),
    quantityValue: prescription.quantity,
    items,
    reviewHistory,
    latestReview,
    reviewSummary: buildPrescriptionReviewSummary(reviewRecords),
    fhirRaw: {
      pharmacy_id: prescription.pharmacyId,
      prescriber_id: prescriber?.npi || String(prescription.prescriberId),
      drug_name: drugNames,
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

    const patientId = req.query?.patientId ? Number(req.query.patientId) : null;

    const where = {};
    if (status) {
      where.statusId = await getPrescriptionStatusId(status);
    }
    if (patientId) {
      where.patientId = patientId;
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
      drug_items,
      drug_name,
      status,
      quantity,
      verified_by,
    } = req.body || {};

    if (!patient_id) {
      return res.status(400).json({ success: false, message: "patient_id is required." });
    }

    const patient = await Patient.findByPk(patient_id);
    if (!patient) {
      return res.status(400).json({ success: false, message: "Patient not found for patient_id." });
    }

    // Support new drug_items format: [{ name, quantity }]
    // Fall back to legacy drug_name array + quantity for backwards compat
    let items = [];
    if (Array.isArray(drug_items) && drug_items.length > 0) {
      items = drug_items
        .filter((item) => item?.name && String(item.name).trim())
        .map((item) => ({
          name: String(item.name).trim(),
          quantity: Number(item.quantity) > 0 ? Math.round(Number(item.quantity)) : 1,
        }));
    } else {
      const drugNameArray = Array.isArray(drug_name)
        ? drug_name.map((v) => String(v || "").trim()).filter(Boolean)
        : [];
      const qty = Number(quantity) > 0 ? Math.round(Number(quantity)) : 1;
      items = drugNameArray.map((name) => ({ name, quantity: qty }));
    }

    if (!items.length) {
      return res.status(400).json({ success: false, message: "At least one drug item is required." });
    }

    const normalizedStatus = normalizePrescriptionStatus(
      STATUS_MAP[String(status || "New").trim()] || status || "new",
    );
    const prescriberRef = await ensurePrescriberByDescriptor({
      npi: prescriber_id || null,
      name: prescriber_id || "Prescription Prescriber",
    });
    const statusId = await getPrescriptionStatusId(normalizedStatus);

    let verifiedById = null;
    if (verified_by) {
      const user = await User.findOne({ where: { email: verified_by } });
      verifiedById = user?.id || null;
    }

    // Resolve drug IDs for all items up front
    const resolvedItems = [];
    for (const item of items) {
      const drugId = await ensureDrugByDescriptor({
        brandName: item.name,
        genericName: item.name,
      });
      resolvedItems.push({ ...item, drugId });
    }

    // Create ONE prescription using the first drug as the primary reference
    const firstItem = resolvedItems[0];
    const prescription = await Prescription.create({
      patientId: Number(patient_id),
      prescriberId: prescriberRef,
      drugId: firstItem.drugId,
      insuranceId: null,
      status: normalizedStatus,
      statusId,
      quantity: firstItem.quantity,
      enteredById: req.user?.id || 1,
      verifiedById,
    });

    // Create a PrescriptionItem row for every drug
    await Promise.all(
      resolvedItems.map((item) =>
        PrescriptionItem.create({
          prescriptionId: prescription.id,
          drugId: item.drugId,
          quantity: item.quantity,
          lotId: null,
          quantityBlocked: 0,
        }),
      ),
    );

    const fullPrescription = await loadPrescriptionWithPatient(prescription.id);

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "created",
      summary: `Created prescription ${prescription.id} with ${resolvedItems.length} drug item(s).`,
      metadata: await serializePrescription(fullPrescription),
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully.",
      data: await serializePrescription(fullPrescription),
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

    prescription.statusId = await getPrescriptionStatusId("in_process");
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

// Helper shared by getDrugAvailability and assignItemLot
const checkDrugAvailability = async (drug) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allLots = await InventoryLot.findAll({ where: { drugId: drug.id } });
  const activeLots = allLots
    .map((l) => ({
      id: l.id,
      lotNumber: l.lotNumber,
      expiryDate: l.expiryDate,
      quantityOnHand: l.quantityOnHand,
      expired: new Date(l.expiryDate) < today,
    }))
    .filter((l) => !l.expired && l.quantityOnHand > 0);

  let alternatives = [];
  if (activeLots.length === 0 && drug.genericname) {
    const sameName = String(drug.genericname).trim().toLowerCase();
    const altDrugs = await Drug.findAll({ where: { id: { [Op.ne]: drug.id } } });
    const matchingDrugs = altDrugs.filter(
      (d) =>
        String(d.genericname || "").trim().toLowerCase() === sameName ||
        String(d.brandname || "").trim().toLowerCase() === sameName,
    );
    for (const altDrug of matchingDrugs) {
      const altLots = await InventoryLot.findAll({ where: { drugId: altDrug.id } });
      const altActive = altLots.filter(
        (l) => new Date(l.expiryDate) >= today && l.quantityOnHand > 0,
      );
      if (altActive.length > 0) {
        alternatives.push({
          drug: {
            id: altDrug.id,
            brandname: altDrug.brandname,
            genericname: altDrug.genericname,
            dosageform: altDrug.dosageform,
            route: altDrug.route,
          },
          lots: altActive.map((l) => ({
            id: l.id,
            lotNumber: l.lotNumber,
            expiryDate: l.expiryDate,
            quantityOnHand: l.quantityOnHand,
          })),
        });
      }
    }
  }

  return {
    drug: {
      id: drug.id,
      brandname: drug.brandname,
      genericname: drug.genericname,
      dosageform: drug.dosageform,
      route: drug.route,
      ndc: drug.productndc,
    },
    available: activeLots.length > 0,
    lots: activeLots,
    alternatives,
  };
};

export const getDrugAvailability = async (req, res) => {
  try {
    const prescription = await loadPrescriptionWithPatient(req.params.id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    // Per-item availability (new multi-drug model)
    const prescriptionItems = prescription.items || [];
    const itemAvailability = await Promise.all(
      prescriptionItems.map(async (item) => {
        if (!item.drug) return null;
        const avail = await checkDrugAvailability(item.drug);
        return {
          itemId: item.id,
          drugId: item.drugId,
          quantity: item.quantity,
          quantityBlocked: item.quantityBlocked || 0,
          lotId: item.lotId || null,
          lot: item.lot
            ? {
                id: item.lot.id,
                lotNumber: item.lot.lotNumber,
                expiryDate: item.lot.expiryDate,
                quantityOnHand: item.lot.quantityOnHand,
              }
            : null,
          ...avail,
        };
      }),
    );

    // Legacy primary-drug fields for backward compat
    const primaryDrug = await Drug.findByPk(prescription.drugId);
    const primaryAvail = primaryDrug ? await checkDrugAvailability(primaryDrug) : null;

    return res.status(200).json({
      success: true,
      data: {
        drug: primaryAvail?.drug || null,
        available: primaryAvail?.available || false,
        lots: primaryAvail?.lots || [],
        alternatives: primaryAvail?.alternatives || [],
        items: itemAvailability.filter(Boolean),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to check drug availability." });
  }
};

export const assignItemLot = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { lotId, quantity } = req.body || {};

    const prescription = await Prescription.findByPk(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    if (prescription.status !== "in_process") {
      return res.status(400).json({
        success: false,
        message: "Lots can only be assigned while the prescription is In Process.",
      });
    }

    const item = await PrescriptionItem.findOne({ where: { id: Number(itemId), prescriptionId: Number(id) } });
    if (!item) {
      return res.status(404).json({ success: false, message: "Prescription item not found." });
    }

    // Clear assignment when lotId is absent/null
    if (!lotId) {
      item.lotId = null;
      item.quantityBlocked = 0;
      await item.save();
      return res.status(200).json({
        success: true,
        message: "Lot assignment cleared.",
        data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
      });
    }

    const lot = await InventoryLot.findByPk(Number(lotId));
    if (!lot) {
      return res.status(404).json({ success: false, message: "Inventory lot not found." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(lot.expiryDate) < today) {
      return res.status(400).json({ success: false, message: "Cannot assign an expired lot." });
    }

    const blockQty = Number(quantity) > 0 ? Math.round(Number(quantity)) : item.quantity;
    if (lot.quantityOnHand < blockQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Requested ${blockQty} but only ${lot.quantityOnHand} available in lot ${lot.lotNumber}.`,
      });
    }

    item.lotId = lot.id;
    item.quantityBlocked = blockQty;
    await item.save();

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "updated",
      summary: `Assigned lot ${lot.lotNumber} to item ${item.id} on prescription ${prescription.id} — ${blockQty} units blocked.`,
      metadata: { prescriptionId: prescription.id, itemId: item.id, lotId: lot.id, quantity: blockQty },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: `Lot ${lot.lotNumber} assigned — ${blockQty} units blocked.`,
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to assign lot." });
  }
};

export const getLotsForPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    const lots = await getLotsForDrug(prescription.drugId);
    return res.status(200).json({ success: true, data: lots });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to load lots." });
  }
};

export const markPrescriptionReady = async (req, res) => {
  try {
    const prescription = await loadPrescriptionWithPatient(req.params.id);

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    if (prescription.status !== "in_process") {
      return res.status(400).json({
        success: false,
        message: "Only prescriptions In Process can be marked as Ready.",
      });
    }

    const itemsToDeduct = (prescription.items || []).filter(
      (item) => item.lotId && item.quantityBlocked > 0,
    );

    await sequelize.transaction(async (t) => {
      for (const item of itemsToDeduct) {
        const lot = await InventoryLot.findByPk(item.lotId, { lock: t.LOCK.UPDATE, transaction: t });
        if (!lot) {
          throw Object.assign(new Error(`Lot ${item.lotId} not found.`), { status: 400 });
        }
        if (lot.quantityOnHand < item.quantityBlocked) {
          throw Object.assign(
            new Error(
              `Insufficient stock in lot ${lot.lotNumber}. Required: ${item.quantityBlocked}, available: ${lot.quantityOnHand}.`,
            ),
            { status: 400 },
          );
        }
        lot.quantityOnHand -= item.quantityBlocked;
        await lot.save({ transaction: t });
      }

      prescription.statusId = await getPrescriptionStatusId("ready");
      prescription.status = "ready";
      await prescription.save({ transaction: t });
    });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "marked_ready",
      summary: `Prescription ${prescription.id} marked as Ready. ${itemsToDeduct.length} lot deduction(s) applied.`,
      metadata: {
        prescriptionId: prescription.id,
        deductions: itemsToDeduct.map((i) => ({
          itemId: i.id,
          lotId: i.lotId,
          quantity: i.quantityBlocked,
        })),
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Prescription marked as Ready for pickup.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    const status = error.status ?? 500;
    return res.status(status).json({ success: false, message: error.message || "Failed to mark prescription ready." });
  }
};

export const markPrescriptionPickedUp = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    if (prescription.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: "Only Ready prescriptions can be marked as Picked Up.",
      });
    }

    prescription.statusId = await getPrescriptionStatusId("picked_up");
    prescription.status = "picked_up";
    await prescription.save();

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "picked_up",
      summary: `Prescription ${prescription.id} marked as Picked Up.`,
      metadata: { prescriptionId: prescription.id },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Prescription marked as Picked Up.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to mark prescription as picked up." });
  }
};

export const cancelPrescription = async (req, res) => {
  try {
    const prescription = await loadPrescriptionWithPatient(req.params.id);

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found." });
    }

    if (["picked_up", "cancelled"].includes(prescription.status)) {
      return res.status(400).json({
        success: false,
        message: "Picked Up or already Cancelled prescriptions cannot be cancelled.",
      });
    }

    const reason = String(req.body?.reason || "").trim() || "No reason provided.";

    // Release any blocked lot quantities on items
    await Promise.all(
      (prescription.items || []).map((item) => {
        if (item.lotId || item.quantityBlocked > 0) {
          item.lotId = null;
          item.quantityBlocked = 0;
          return item.save();
        }
        return Promise.resolve();
      }),
    );

    prescription.statusId = await getPrescriptionStatusId("cancelled");
    prescription.status = "cancelled";
    await prescription.save();

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "cancelled",
      summary: `Prescription ${prescription.id} cancelled. Reason: ${reason}`,
      metadata: { prescriptionId: prescription.id, reason },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Prescription cancelled.",
      data: await serializePrescription(await loadPrescriptionWithPatient(prescription.id)),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Failed to cancel prescription." });
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
