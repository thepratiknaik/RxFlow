import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { getDefaultPharmacyId } from "../services/schemaCompatService.js";

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "log_id",
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "pharmacy_id",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    actionType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "action_type",
    },
    entityTable: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "entity_table",
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entity_id",
    },
    auditType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "general",
      field: "audit_type",
    },
    changes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "audit_log",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

AuditLog.beforeValidate(async (entry) => {
  if (!entry.pharmacyId) {
    const pharmacyId = await getDefaultPharmacyId();
    if (!pharmacyId) {
      throw new Error(
        "At least one pharmacy row must exist before creating audit logs.",
      );
    }
    entry.pharmacyId = pharmacyId;
  }

  if (!entry.userId) {
    entry.userId = 1;
  }
});

export default AuditLog;
