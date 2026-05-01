import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const SubscriptionInvoice = sequelize.define(
  "SubscriptionInvoice",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    pharmacyId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pharmacyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    billingPeriodStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    billingPeriodEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "USD",
    },
    subtotalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("draft", "issued", "paid", "void"),
      allowNull: false,
      defaultValue: "issued",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    generatedByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    tableName: "subscription_invoices",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    indexes: [
      {
        fields: ["pharmacyId", "billingPeriodStart", "billingPeriodEnd"],
        name: "subscription_invoices_pharmacy_period_idx",
      },
      {
        unique: true,
        fields: ["invoiceNumber"],
        name: "subscription_invoices_number_unique",
      },
    ],
  },
);

export default SubscriptionInvoice;
