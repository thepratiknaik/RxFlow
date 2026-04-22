import express from "express";
import {
  updateProfile,
  changePassword,
} from "../controllers/profileController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/profile",
  module: "Profile",
};

router.patch("/", verifyToken, updateProfile);
router.patch("/password", verifyToken, changePassword);
router.put("/", verifyToken, updateProfile);
router.put("/password", verifyToken, changePassword);

export default router;
