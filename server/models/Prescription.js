import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Patient from "./Patient.js";
import {
  getDefaultPharmacyId,
  getPrescriptionStatusId,
  getPrescriptionStatusNameById,
  normalizePrescriptionStatus,
} from "../services/schemaCompatService.js";

const Prescription = sequelize.define(
  "Prescription",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "prescription_id",
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacy_id",
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "patient_id",
    },
    prescriberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "prescriber_id",
    },
    drugId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "drug_id",
    },
    insuranceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "insurance_id",
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "status_id",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    enteredById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entered_by",
    },
    verifiedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "verified_by",
    },
    status: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue("statusName") || "new";
      },
      set(value) {
        this.setDataValue("statusName", normalizePrescriptionStatus(value));
      },
    },
    prescriptionNumber: {
      type: DataTypes.VIRTUAL,
      get() {
        return String(this.id || "");
      },
    },
    quantityValue: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.quantity ?? null;
      },
    },
  },
  {
    tableName: "prescription",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

Prescription.beforeValidate(async (prescription) => {
  if (!prescription.pharmacyId) {
    const pharmacyId = await getDefaultPharmacyId();
    if (!pharmacyId) {
      throw new Error("At least one pharmacy row must exist before creating prescriptions.");
    }
    prescription.pharmacyId = pharmacyId;
  }

  if (!prescription.statusId) {
    prescription.statusId = await getPrescriptionStatusId(
      prescription.getDataValue("statusName") || prescription.status || "new",
    );
  }
});

Prescription.afterFind(async (result) => {
  const records = Array.isArray(result) ? result : result ? [result] : [];
  await Promise.all(
    records.map(async (prescription) => {
      prescription.setDataValue(
        "statusName",
        await getPrescriptionStatusNameById(prescription.statusId),
      );
    }),
  );
});

Prescription.belongsTo(Patient, { foreignKey: "patientId", as: "patient" });

export default Prescription;
