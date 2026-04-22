import { Op } from "sequelize";
import AuditLog from "../models/AuditLog.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

export const listAuditLogs = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 25, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const entityType = String(req.query?.entityType || "").trim();
    const action = String(req.query?.action || "").trim();
    const q = String(req.query?.q || "").trim();

    const where = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (action) {
      where.action = action;
    }

    if (q) {
      where[Op.or] = [
        { summary: { [Op.iLike]: `%${q}%` } },
        { entityType: { [Op.iLike]: `%${q}%` } },
        { action: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["createdat", "DESC"]],
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
      message: error.message || "Failed to load audit logs.",
    });
  }
};
