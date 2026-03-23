import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const DrugPullAudit = sequelize.define(
  "DrugPullAudit",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    jobid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("queued", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "queued",
    },
    searchterm: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    requestedlimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 25,
    },
    sourcetotalmatches: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pulled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    inserted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    updated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errormessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestedbyuserid: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    startedat: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedat: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "drug_pull_audits",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
  },
);

export default DrugPullAudit;
