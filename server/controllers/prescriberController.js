import { Op } from "sequelize";
import Prescriber from "../models/Prescriber.js";
import Prescription from "../models/Prescription.js";
import Patient from "../models/Patient.js";
import {
  getReviewStatus,
  listPrescriptionReviewRecords,
} from "../services/prescriptionNotificationService.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

const serializePrescriber = (prescriber) => {
  const plain = prescriber?.toJSON ? prescriber.toJSON() : prescriber;
  return plain;
};

export const listPrescribers = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 25, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const q = String(req.query?.q || "").trim();

    const where = q
      ? {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${q}%` } },
            { lastName: { [Op.iLike]: `%${q}%` } },
            { contact: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
            { npi: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};

    const { rows, count } = await Prescriber.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows.map(serializePrescriber),
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
      message: error.message || "Failed to list prescribers.",
    });
  }
};

export const createPrescriber = async (req, res) => {
  try {
    const { name, contact, email, npi } = req.body || {};

    if (!name || !contact || !email || !npi) {
      return res.status(400).json({
        success: false,
        message: "name, contact, email, and npi are required.",
      });
    }

    const normalizedNpi = String(npi).trim();
    if (!/^\d{10}$/.test(normalizedNpi)) {
      return res.status(400).json({
        success: false,
        message: "npi must be a 10-digit number.",
      });
    }

    const existing = await Prescriber.findOne({
      where: { npi: normalizedNpi },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A prescriber with this NPI already exists.",
      });
    }

    const prescriber = await Prescriber.create({
      name: String(name).trim(),
      contact: String(contact).trim(),
      email: String(email).trim().toLowerCase(),
      npi: normalizedNpi,
    });

    return res.status(201).json({
      success: true,
      message: "Prescriber created successfully.",
      data: serializePrescriber(prescriber),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create prescriber.",
    });
  }
};

export const getPrescriberHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const prescriber = await Prescriber.findByPk(id);

    if (!prescriber) {
      return res.status(404).json({
        success: false,
        message: "Prescriber not found.",
      });
    }

    const history = await Prescription.findAll({
      where: { prescriberId: Number(id) },
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });
    const historyWithReview = await Promise.all(
      history.map(async (item) => {
        const serialized = item.toJSON ? item.toJSON() : item;
        const reviewHistory = await listPrescriptionReviewRecords(item.id);
        const latestReview = reviewHistory[0] || null;
        return {
          ...serialized,
          reviewHistory: reviewHistory.map((record) => ({
            ...record,
            status: getReviewStatus(record),
          })),
          latestReview,
          reviewSummary: {
            latestStatus: getReviewStatus(latestReview),
            latestSentAt: latestReview?.sentAt || null,
            latestReviewedAt: latestReview?.usedAt || null,
          },
        };
      }),
    );
    const counts = historyWithReview.reduce(
      (acc, item) => {
        const status = item.reviewSummary?.latestStatus || "not_sent";
        if (status === "approved") acc.approved += 1;
        else if (status === "rejected") acc.rejected += 1;
        else if (status === "pending") acc.pending += 1;
        else if (status === "expired") acc.expired += 1;
        else acc.notSent += 1;
        return acc;
      },
      { approved: 0, rejected: 0, pending: 0, expired: 0, notSent: 0 },
    );

    return res.status(200).json({
      success: true,
      data: {
        prescriber: serializePrescriber(prescriber),
        counts,
        history: historyWithReview,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load prescriber history.",
    });
  }
};

export const updatePrescriber = async (req, res) => {
  try {
    const { id } = req.params;
    const prescriber = await Prescriber.findByPk(id);

    if (!prescriber) {
      return res.status(404).json({
        success: false,
        message: "Prescriber not found.",
      });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name).trim();
    }
    if (req.body.contact !== undefined) {
      updates.contact = String(req.body.contact).trim();
    }
    if (req.body.email !== undefined) {
      updates.email = req.body.email
        ? String(req.body.email).trim().toLowerCase()
        : null;
    }
    if (req.body.npi !== undefined) {
      const normalizedNpi = String(req.body.npi).trim();
      if (!/^\d{10}$/.test(normalizedNpi)) {
        return res.status(400).json({
          success: false,
          message: "npi must be a 10-digit number.",
        });
      }
      updates.npi = normalizedNpi;
    }

    if (updates.npi) {
      const existing = await Prescriber.findOne({
        where: {
          id: { [Op.ne]: Number(id) },
          npi: updates.npi,
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "A prescriber with this NPI already exists.",
        });
      }
    }

    const before = serializePrescriber(prescriber);
    await prescriber.update(updates);

    await writeAuditLog({
      entityType: "prescriber",
      entityId: prescriber.id,
      action: "updated",
      summary: `Updated prescriber ${prescriber.name}.`,
      metadata: {
        before,
        after: serializePrescriber(prescriber),
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Prescriber updated successfully.",
      data: serializePrescriber(prescriber),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update prescriber.",
    });
  }
};

export const deletePrescriber = async (req, res) => {
  try {
    const { id } = req.params;
    const prescriber = await Prescriber.findByPk(id);

    if (!prescriber) {
      return res.status(404).json({
        success: false,
        message: "Prescriber not found.",
      });
    }

    const snapshot = serializePrescriber(prescriber);
    await prescriber.destroy();

    await writeAuditLog({
      entityType: "prescriber",
      entityId: Number(id),
      action: "deleted",
      summary: `Deleted prescriber ${snapshot.name}.`,
      metadata: snapshot,
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Prescriber deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete prescriber.",
    });
  }
};
