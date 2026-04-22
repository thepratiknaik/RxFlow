import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PrescriptionReviewToken = sequelize.define(
  "PrescriptionReviewToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    prescriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
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

export default PrescriptionReviewToken;
