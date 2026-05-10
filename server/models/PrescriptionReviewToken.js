import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Prescription from "./Prescription.js";

const PrescriptionReviewToken = sequelize.define(
  "PrescriptionReviewToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prescriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "prescription_id",
    },
    tokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "token_hash",
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "recipient_email",
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "recipient_name",
    },
    reviewUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "review_url",
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sent_at",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
    decision: {
      type: DataTypes.ENUM("approved", "rejected"),
      allowNull: true,
    },
  },
  {
    tableName: "prescription_review_tokens",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    underscored: false,
  },
);

PrescriptionReviewToken.belongsTo(Prescription, {
  foreignKey: "prescriptionId",
  as: "prescription",
});

export default PrescriptionReviewToken;
