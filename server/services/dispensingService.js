import { sequelize } from "../config/db.js";
import InventoryLot from "../models/InventoryLot.js";
import { writeAuditLog, buildActorContext } from "./auditLogService.js";

export const dispensePrescription = async ({ prescriptionId, lotId, quantity, req }) => {
  return await sequelize.transaction(async (t) => {
    const lot = await InventoryLot.findByPk(lotId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!lot) {
      throw Object.assign(new Error("Inventory lot not found."), { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(lot.expiryDate);
    if (expiry < today) {
      throw Object.assign(
        new Error(`Lot ${lot.lotNumber} has expired (${lot.expiryDate}).`),
        { status: 400 },
      );
    }

    if (lot.quantityOnHand < quantity) {
      throw Object.assign(
        new Error(
          `Insufficient stock in lot ${lot.lotNumber}. Available: ${lot.quantityOnHand}, required: ${quantity}.`,
        ),
        { status: 400 },
      );
    }

    lot.quantityOnHand -= quantity;
    await lot.save({ transaction: t });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescriptionId,
      action: "dispensed",
      summary: `Dispensed ${quantity} unit(s) from lot ${lot.lotNumber} for prescription ${prescriptionId}.`,
      metadata: {
        prescriptionId,
        lotId,
        lotNumber: lot.lotNumber,
        quantityDispensed: quantity,
        remainingStock: lot.quantityOnHand,
        drugId: lot.drugId,
      },
      ...buildActorContext(req),
    });

    return lot;
  });
};

export const getLotsForDrug = async (drugId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lots = await InventoryLot.findAll({
    where: { drugId },
    order: [["expiryDate", "ASC"]],
  });

  return lots.map((lot) => ({
    id: lot.id,
    lotNumber: lot.lotNumber,
    expiryDate: lot.expiryDate,
    quantityOnHand: lot.quantityOnHand,
    expired: new Date(lot.expiryDate) < today,
  }));
};
