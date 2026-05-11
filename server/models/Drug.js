import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Drug = sequelize.define(
  "Drug",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "drug_id",
    },
    productndc: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "ndc_code",
    },
    brandname: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "brand_name",
    },
    genericname: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "generic_name",
    },
    dosageform: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "dosage_form",
    },
    route: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    iscontrolled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_controlled",
    },
  },
  {
    tableName: "drug",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

export default Drug;
