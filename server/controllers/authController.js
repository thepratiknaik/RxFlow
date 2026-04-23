import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { normalizeRole } from "../services/schemaCompatService.js";

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword } = req.body;

    // Validation
    if (!fullname || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      fullname,
      email,
      password,
      role: normalizeRole("admin"),
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    // Return response (exclude password)
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error registering user",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user (Sequelize returns all fields including password)
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isactive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Compare passwords
    const isPasswordValid = await user.matchPassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Return response (exclude password)
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error logging in",
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
        lastlogin: null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching user",
    });
  }
};

// @desc    Logout user (client-side token deletion)
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error resetting password",
    });
  }
};

// @desc    List users
// @route   GET /api/auth/users
// @access  Admin
export const listUsers = async (req, res) => {
  try {
    const actor = await User.findByPk(req.user.id);
    if (!actor) {
      return res.status(404).json({
        success: false,
        message: "Requesting user not found.",
      });
    }

    const search = String(req.query.q || "").trim();
    const where = { pharmacyId: actor.pharmacyId };

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      attributes: [
        "id",
        "email",
        "isactive",
        "pharmacyId",
        "roleId",
        "created_at",
        "updated_at",
      ],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
        lastlogin: null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      })),
    });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching users",
    });
  }
};

// @desc    Update another user's role
// @route   PATCH /api/auth/users/:id/role
// @access  Admin
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (!["technician", "pharmacist", "admin", "user"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }

    if (String(req.user?.id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: "Use a separate admin account to change your own role.",
      });
    }

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = normalizeRole(role);
    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
        lastlogin: null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating user role",
    });
  }
};

// @desc    Create a new user as admin
// @route   POST /api/auth/users
// @access  Admin
export const createUser = async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword, role } = req.body;

    if (!fullname || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const nextRole = normalizeRole(role || "technician");

    if (!["technician", "pharmacist", "admin"].includes(nextRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const actor = await User.findByPk(req.user.id);
    if (!actor) {
      return res.status(404).json({
        success: false,
        message: "Requesting user not found.",
      });
    }

    const user = await User.create({
      fullname,
      email,
      password,
      role: nextRole,
      pharmacyId: actor.pharmacyId,
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        pharmacyId: user.pharmacyId,
        isactive: user.isactive,
        lastlogin: null,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error creating user",
    });
  }
};
