import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import SubscriptionInvoice from "./SubscriptionInvoice.js";

const SubscriptionInvoiceItem = sequelize.define(
  "SubscriptionInvoiceItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: SubscriptionInvoice,
        key: "id",
      },
    },
    itemType: {
      type: DataTypes.ENUM("subscription", "usage", "addon", "adjustment"),
      allowNull: false,
      defaultValue: "subscription",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    lineTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "subscription_invoice_items",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    indexes: [
      {
        fields: ["invoiceId"],
        name: "subscription_invoice_items_invoice_idx",
      },
    ],
  },
);

SubscriptionInvoice.hasMany(SubscriptionInvoiceItem, {
  foreignKey: "invoiceId",
  as: "items",
  onDelete: "CASCADE",
});
SubscriptionInvoiceItem.belongsTo(SubscriptionInvoice, {
  foreignKey: "invoiceId",
  as: "invoice",
});

export default SubscriptionInvoiceItem;
