import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Patient from "./Patient.js";

const Prescription = sequelize.define(
  "Prescription",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prescriptionNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(
        "new",
        "in_process",
        "ready",
        "picked_up",
        "completed",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "new",
    },
    source: {
      type: DataTypes.ENUM("fhir", "manual"),
      allowNull: false,
    },
    fhirServerBaseUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fhirResourceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fhirClinicalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fhirLastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fhirRaw: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Patient,
        key: "id",
      },
    },
    externalSubjectRef: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    medicationDisplay: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    medicationCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sig: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantityValue: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    quantityUnit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refillsAllowed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    authoredOn: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    prescriberDisplay: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    insuranceProviderName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    insurancePolicyNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    insuranceGroupId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    etInApproved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    etInApprovedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    etInApprovedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    dispensedLotId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "inventory_lots",
        key: "id",
      },
    },
    dispensedLotNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dispensedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
      },
    },
    dispensedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dispensedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "prescriptions",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    indexes: [
      {
        unique: true,
        fields: ["fhirServerBaseUrl", "fhirResourceId"],
        name: "prescriptions_fhir_server_resource_unique",
      },
      {
        fields: ["status", "createdat"],
        name: "prescriptions_status_created_idx",
      },
    ],
  },
);

Prescription.belongsTo(Patient, { foreignKey: "patientId", as: "patient" });

export default Prescription;
