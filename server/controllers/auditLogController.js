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
      where.entityTable = entityType;
    }

    if (action) {
      where.actionType = action.toUpperCase();
    }

    if (q) {
      where[Op.or] = [
        { entityTable: { [Op.iLike]: `%${q}%` } },
        { actionType: { [Op.iLike]: `%${q.toUpperCase()}%` } },
      ];
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["created_at", "DESC"]],
    });

    const data = rows.map((row) => {
      const changes = row.changes || {};
      return {
        id: row.id,
        entityType: row.entityTable,
        entityId: row.entityId,
        action: changes.action || row.actionType.toLowerCase(),
        actorUserId: row.userId,
        actorRole: changes.actorRole || null,
        summary: changes.summary || `${row.entityTable} ${row.actionType}`,
        metadata: changes.metadata || null,
        createdat: row.created_at,
      };
    });

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
      message: error.message || "Failed to load audit logs.",
    });
  }
};
