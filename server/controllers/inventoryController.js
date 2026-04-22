import { Op } from "sequelize";
import Drug from "../models/Drug.js";
import InventoryLot from "../models/InventoryLot.js";
import { sequelize } from "../config/db.js";
import {
  drugDisplayName,
  enrichInventoryLot,
} from "../services/inventoryService.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";

const toLimit = (value, fallback = 50, max = 200) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

const loadInventoryLot = async (id) =>
  await InventoryLot.findByPk(id, {
    include: [
      {
        model: Drug,
        as: "drug",
        required: true,
      },
    ],
  });

const serializeInventoryLot = (row) => {
  const plain = row.get({ plain: true });
  const enriched = enrichInventoryLot(plain);
  return {
    ...enriched,
    drugDisplayName: drugDisplayName(plain.drug),
  };
};

export const listInventoryLots = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 50, 200);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const onlyLow =
      req.query?.belowThreshold === "true" || req.query?.belowThreshold === "1";

    const lowStockCondition = sequelize.where(
      sequelize.col("InventoryLot.quantityOnHand"),
      Op.lt,
      sequelize.col("InventoryLot.minimumLevel"),
    );

    const where = onlyLow ? lowStockCondition : {};

    const [belowThresholdTotal, totalLotRows] = await Promise.all([
      InventoryLot.count({ where: lowStockCondition }),
      InventoryLot.count(),
    ]);

    const { rows, count } = await InventoryLot.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [
        ["expiryDate", "ASC"],
        ["createdat", "DESC"],
      ],
      include: [
        {
          model: Drug,
          as: "drug",
          required: true,
        },
      ],
    });

    const data = rows.map(serializeInventoryLot);

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
      summary: {
        belowThresholdTotal,
        totalLotRows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list inventory lots.",
    });
  }
};

export const createInventoryLot = async (req, res) => {
  try {
    const {
      drugId,
      lotNumber,
      expiryDate,
      quantityOnHand,
      minimumLevel,
    } = req.body || {};

    if (!drugId || !lotNumber || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "drugId, lotNumber, and expiryDate are required.",
      });
    }

    const drug = await Drug.findByPk(drugId);
    if (!drug) {
      return res.status(400).json({
        success: false,
        message: "Drug not found for drugId.",
      });
    }

    const qty =
      quantityOnHand != null && quantityOnHand !== ""
        ? Number(quantityOnHand)
        : 0;
    const min =
      minimumLevel != null && minimumLevel !== ""
        ? Number(minimumLevel)
        : 10;

    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: "quantityOnHand must be a non-negative number.",
      });
    }

    if (!Number.isFinite(min) || min < 0) {
      return res.status(400).json({
        success: false,
        message: "minimumLevel must be a non-negative number.",
      });
    }

    const lot = await InventoryLot.create({
      drugId,
      lotNumber: String(lotNumber).trim(),
      expiryDate: String(expiryDate).slice(0, 10),
      quantityOnHand: qty,
      minimumLevel: min,
    });

    const withDrug = await loadInventoryLot(lot.id);
    const serialized = serializeInventoryLot(withDrug);

    await writeAuditLog({
      entityType: "inventory_lot",
      entityId: lot.id,
      action: "created",
      summary: `Created lot ${lot.lotNumber} for ${serialized.drugDisplayName || "inventory item"}.`,
      metadata: serialized,
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      data: serialized,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A lot with this number already exists for this drug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create inventory lot.",
    });
  }
};

export const updateInventoryLot = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await loadInventoryLot(id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Inventory lot not found.",
      });
    }

    const updates = {};
    const { lotNumber, expiryDate, quantityOnHand, minimumLevel } = req.body || {};

    if (lotNumber !== undefined) {
      updates.lotNumber = String(lotNumber).trim();
    }

    if (expiryDate !== undefined) {
      updates.expiryDate = expiryDate ? String(expiryDate).slice(0, 10) : null;
    }

    if (quantityOnHand !== undefined) {
      const qty = Number(quantityOnHand);
      if (!Number.isFinite(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: "quantityOnHand must be a non-negative number.",
        });
      }
      updates.quantityOnHand = qty;
    }

    if (minimumLevel !== undefined) {
      const min = Number(minimumLevel);
      if (!Number.isFinite(min) || min < 0) {
        return res.status(400).json({
          success: false,
          message: "minimumLevel must be a non-negative number.",
        });
      }
      updates.minimumLevel = min;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one of: lotNumber, expiryDate, quantityOnHand, minimumLevel.",
      });
    }

    const before = serializeInventoryLot(lot);
    await lot.update(updates);
    const updated = await loadInventoryLot(id);
    const serialized = serializeInventoryLot(updated);

    await writeAuditLog({
      entityType: "inventory_lot",
      entityId: updated.id,
      action: "updated",
      summary: `Updated lot ${serialized.lotNumber} for ${serialized.drugDisplayName || "inventory item"}.`,
      metadata: {
        before,
        after: serialized,
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Inventory lot updated successfully.",
      data: serialized,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A lot with this number already exists for this drug.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update inventory lot.",
    });
  }
};

export const deleteInventoryLot = async (req, res) => {
  try {
    const { id } = req.params;
    const lot = await loadInventoryLot(id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Inventory lot not found.",
      });
    }

    const serialized = serializeInventoryLot(lot);
    await lot.destroy();

    await writeAuditLog({
      entityType: "inventory_lot",
      entityId: id,
      action: "deleted",
      summary: `Deleted lot ${serialized.lotNumber} for ${serialized.drugDisplayName || "inventory item"}.`,
      metadata: serialized,
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Inventory lot deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete inventory lot.",
    });
  }
};
