import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import Drug from "./Drug.js";

const InventoryLot = sequelize.define(
  "InventoryLot",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    drugId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Drug,
        key: "id",
      },
    },
    lotNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    quantityOnHand: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    minimumLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "inventory_lots",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    indexes: [
      {
        unique: true,
        fields: ["drugId", "lotNumber"],
        name: "inventory_lots_drug_lot_unique",
      },
    ],
  },
);

InventoryLot.belongsTo(Drug, { foreignKey: "drugId", as: "drug" });

export default InventoryLot;
