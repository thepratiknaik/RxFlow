import Drug from "../models/Drug.js";
import InventoryLot from "../models/InventoryLot.js";
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
  const minimumLevel = Number(plain.minimumLevel ?? 0);
  const quantityOnHand = Number(plain.quantityOnHand ?? 0);
  const belowThreshold = quantityOnHand < minimumLevel;
  return {
    ...plain,
    minimumLevel,
    belowThreshold,
    thresholdDelta: quantityOnHand - minimumLevel,
    drugDisplayName:
      plain.drug?.brandname || plain.drug?.genericname || plain.drug?.productndc || "Drug",
  };
};

export const listInventoryLots = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 50, 200);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const belowThresholdOnly =
      String(req.query?.belowThreshold || "").toLowerCase() === "true";

    const { rows } = await InventoryLot.findAndCountAll({
      order: [["expiryDate", "ASC"]],
      include: [
        {
          model: Drug,
          as: "drug",
          required: true,
        },
      ],
    });

    const serializedRows = rows.map(serializeInventoryLot);
    const filteredRows = belowThresholdOnly
      ? serializedRows.filter((row) => row.belowThreshold)
      : serializedRows;
    const count = filteredRows.length;
    const data = filteredRows.slice((page - 1) * limit, page * limit);
    const belowThresholdTotal = serializedRows.filter(
      (row) => row.belowThreshold,
    ).length;

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
        totalLotRows: serializedRows.length,
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
    const { drugId, lotNumber, expiryDate, quantityOnHand, minimumLevel } = req.body || {};

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
    const minLevel =
      minimumLevel != null && minimumLevel !== ""
        ? Number(minimumLevel)
        : 0;

    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: "quantityOnHand must be a non-negative number.",
      });
    }
    if (!Number.isFinite(minLevel) || minLevel < 0) {
      return res.status(400).json({
        success: false,
        message: "minimumLevel must be a non-negative number.",
      });
    }

    const lot = await InventoryLot.create({
      drugId: Number(drugId),
      lotNumber: String(lotNumber).trim(),
      expiryDate: String(expiryDate).slice(0, 10),
      minimumLevel: minLevel,
      quantityOnHand: qty,
    });

    const withDrug = await loadInventoryLot(lot.id);
    const serialized = serializeInventoryLot(withDrug);

    await writeAuditLog({
      entityType: "inventory_lot",
      entityId: lot.id,
      action: "created",
      summary: `Created lot ${lot.lotNumber}.`,
      metadata: serialized,
      ...buildActorContext(req),
    });

    return res.status(201).json({
      success: true,
      data: serialized,
    });
  } catch (error) {
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
    if (req.body.lotNumber !== undefined) {
      updates.lotNumber = String(req.body.lotNumber).trim();
    }
    if (req.body.expiryDate !== undefined) {
      updates.expiryDate = req.body.expiryDate
        ? String(req.body.expiryDate).slice(0, 10)
        : null;
    }
    if (req.body.quantityOnHand !== undefined) {
      const qty = Number(req.body.quantityOnHand);
      if (!Number.isFinite(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: "quantityOnHand must be a non-negative number.",
        });
      }
      updates.quantityOnHand = qty;
    }
    if (req.body.minimumLevel !== undefined) {
      const minLevel = Number(req.body.minimumLevel);
      if (!Number.isFinite(minLevel) || minLevel < 0) {
        return res.status(400).json({
          success: false,
          message: "minimumLevel must be a non-negative number.",
        });
      }
      updates.minimumLevel = minLevel;
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
      summary: `Updated lot ${serialized.lotNumber}.`,
      metadata: { before, after: serialized },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message: "Inventory lot updated successfully.",
      data: serialized,
    });
  } catch (error) {
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
      entityId: Number(id),
      action: "deleted",
      summary: `Deleted lot ${serialized.lotNumber}.`,
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
