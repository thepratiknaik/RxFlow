import express from "express";
import {
  register,
  login,
  getMe,
  logout,
  resetPassword,
  listUsers,
  updateUserRole,
  createUser,
  setupPharmacy,
} from "../controllers/authController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/auth",
  module: "Auth",
};

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);

// Protected routes
router.post(
  "/setup-pharmacy",
  verifyToken,
  authorize(["admin"]),
  setupPharmacy,
);
router.post("/users", verifyToken, authorize(["admin"]), createUser);
router.get("/users", verifyToken, authorize(["admin"]), listUsers);
router.patch(
  "/users/:id/role",
  verifyToken,
  authorize(["admin"]),
  updateUserRole,
);
router.put(
  "/users/:id/role",
  verifyToken,
  authorize(["admin"]),
  updateUserRole,
);
router.get("/me", verifyToken, getMe);
router.get("/logout", verifyToken, logout);

export default router;
