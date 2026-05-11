import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Patient from "./Patient.js";

const PatientInsurance = sequelize.define(
  "PatientInsurance",
  {
    insurance_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "patient",
        key: "patient_id",
      },
    },
    provider_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    member_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bin_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pcn_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "insurance",
    timestamps: false,
  },
);

PatientInsurance.belongsTo(Patient, {
  foreignKey: "patient_id",
  as: "patient",
});

export default PatientInsurance;
