import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Pharmacy = sequelize.define(
  "Pharmacy",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "pharmacy_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "license_number",
    },
    subscriptionTier: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "subscription_tier",
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "status_id",
    },
  },
  {
    tableName: "pharmacy",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default Pharmacy;
