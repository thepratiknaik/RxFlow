import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Patient from "./Patient.js";

const PatientAuditLog = sequelize.define(
  "PatientAuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Patient,
        key: "id",
      },
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    changedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "patient_audit_logs",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: false,
    underscored: false,
  },
);

PatientAuditLog.belongsTo(Patient, {
  foreignKey: "patientId",
  onDelete: "CASCADE",
});

export default PatientAuditLog;
