import { DataTypes } from "sequelize";
import bcryptjs from "bcryptjs";
import { sequelize } from "../config/db.js";
import {
  getDefaultPharmacyId,
  getRoleIdByName,
  getRoleNameById,
  normalizeRole,
} from "../services/schemaCompatService.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "user_id",
    },
    pharmacyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "pharmacy_id",
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "role_id",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
    },
    isactive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastlogin: {
      type: DataTypes.VIRTUAL,
      get() {
        return null;
      },
    },
    role: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue("roleName") || "technician";
      },
      set(value) {
        this.setDataValue("roleName", normalizeRole(value));
      },
    },
  },
  {
    tableName: "user",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

User.beforeValidate(async (user) => {
  if (!user.roleId) {
    user.roleId = await getRoleIdByName(
      user.getDataValue("roleName") || "technician",
    );
  }
});

User.afterFind(async (result) => {
  const records = Array.isArray(result) ? result : result ? [result] : [];
  await Promise.all(
    records.map(async (user) => {
      user.setDataValue("roleName", await getRoleNameById(user.roleId));
    }),
  );
});

User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(user.password, salt);
  }

  if (user.changed("role")) {
    user.roleId = await getRoleIdByName(user.role);
  }
});

User.prototype.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default User;
