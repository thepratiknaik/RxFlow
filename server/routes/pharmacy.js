import express from "express";
import {
  getPharmacy,
  updatePharmacy,
  setupPharmacyOnboarding,
} from "../controllers/pharmacyController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/pharmacy",
  module: "Pharmacy",
};

router.get("/", verifyToken, getPharmacy);
router.post("/setup", verifyToken, authorize(["admin"]), setupPharmacyOnboarding);
router.patch("/", verifyToken, authorize(["admin"]), updatePharmacy);
router.put("/", verifyToken, authorize(["admin"]), updatePharmacy);

export default router;
