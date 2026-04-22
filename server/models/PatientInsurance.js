import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Patient from "./Patient.js";

const PatientInsurance = sequelize.define(
  "PatientInsurance",
  {
    insurance_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "patients",
        key: "id",
      },
      onDelete: "CASCADE",
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
      allowNull: true,
    },
    pcn_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "patient_insurances",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    underscored: false,
    indexes: [
      {
        fields: ["patient_id"],
        name: "patient_insurances_patient_id_idx",
      },
    ],
  },
);

PatientInsurance.belongsTo(Patient, {
  foreignKey: "patient_id",
  as: "patient",
});

export default PatientInsurance;
