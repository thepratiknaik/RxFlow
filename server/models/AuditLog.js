import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "audit_logs",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: false,
    indexes: [
      {
        fields: ["entityType", "createdat"],
        name: "audit_logs_entity_created_idx",
      },
      {
        fields: ["actorUserId", "createdat"],
        name: "audit_logs_actor_created_idx",
      },
    ],
  },
);

export default AuditLog;
