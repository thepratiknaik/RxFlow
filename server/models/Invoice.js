import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Invoice = sequelize.define(
  "Invoice",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacy_id",
    },
    stripeInvoiceId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "stripe_invoice_id",
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "invoice_number",
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "draft",
    },
    amountDue: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "amount_due",
    },
    amountPaid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "amount_paid",
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "period_start",
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "period_end",
    },
    hostedInvoiceUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "hosted_invoice_url",
    },
    invoicePdf: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "invoice_pdf",
    },
    stripeCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "stripe_created_at",
    },
  },
  {
    tableName: "stripe_invoice",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default Invoice;
