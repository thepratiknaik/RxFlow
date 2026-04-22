import { DataTypes } from "sequelize";
import bcryptjs from "bcryptjs";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullname: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Please provide a full name",
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      lowercase: true,
      validate: {
        isEmail: {
          msg: "Please provide a valid email",
        },
        notEmpty: {
          msg: "Please provide an email",
        },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: {
          args: [8, 255],
          msg: "Password must be at least 8 characters",
        },
      },
    },
    role: {
      type: DataTypes.ENUM("user", "pharmacist", "admin"),
      defaultValue: "user",
    },
    isactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastlogin: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "createdat",
    updatedAt: "updatedat",
    underscored: false,
  },
);

// Hash password before saving
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
});

// Method to compare passwords
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

export default User;
