import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PrescriptionItem = sequelize.define(
  "PrescriptionItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "item_id",
    },
    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "prescription_id",
    },
    drugId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "drug_id",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    lotId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "lot_id",
    },
    quantityBlocked: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantity_blocked",
    },
  },
  {
    tableName: "prescription_item",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

export default PrescriptionItem;
