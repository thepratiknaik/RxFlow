import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Drug = sequelize.define(
  "Drug",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productndc: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: "productndc is required",
        },
      },
    },
    genericname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brandname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    labelername: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dosageform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    producttype: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    activesubstances: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    packaging: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "openfda",
    },
  },
  {
    tableName: "drugs",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
  },
);

export default Drug;
