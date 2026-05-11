import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Drug from "./Drug.js";
import { getDefaultPharmacyId } from "../services/schemaCompatService.js";

const InventoryLot = sequelize.define(
  "InventoryLot",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "lot_id",
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacy_id",
    },
    drugId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "drug_id",
      references: {
        model: Drug,
        key: "id",
      },
    },
    lotNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "lot_number",
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "expiration_date",
    },
    minimumLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "minimum_level",
    },
    quantityOnHand: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantity_on_hand",
    },
  },
  {
    tableName: "inventory_lot",
    timestamps: false,
  },
);

InventoryLot.beforeValidate(async (lot) => {
  if (!lot.pharmacyId) {
    const pharmacyId = await getDefaultPharmacyId();
    if (!pharmacyId) {
      throw new Error("At least one pharmacy row must exist before creating inventory lots.");
    }
    lot.pharmacyId = pharmacyId;
  }
});

InventoryLot.belongsTo(Drug, { foreignKey: "drugId", as: "drug" });

export default InventoryLot;
