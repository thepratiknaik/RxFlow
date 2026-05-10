import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { getDefaultPharmacyId } from "../services/schemaCompatService.js";

const Patient = sequelize.define(
  "Patient",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "patient_id",
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacy_id",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "last_name",
    },
    middleName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "middle_name",
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "dob",
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phonePrimary: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "phone_primary",
    },
    phoneSecondary: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "phone_secondary",
    },
    addressLine1: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "address_line1",
    },
    addressLine2: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "address_line2",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "zip_code",
    },
    mrn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "patient",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Patient.beforeValidate(async (patient) => {
  if (!patient.pharmacyId) {
    const pharmacyId = await getDefaultPharmacyId();
    if (!pharmacyId) {
      throw new Error("At least one pharmacy row must exist before creating patients.");
    }
    patient.pharmacyId = pharmacyId;
  }
});

export default Patient;
