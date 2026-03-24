import express from "express";
import {
  searchPatients,
  getPatient,
  createPatient,
  updatePatient,
  getPatientAudits,
} from "../controllers/patientController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/patients",
  module: "Patients",
};

// Search patients
router.get("/", verifyToken, searchPatients);

// Create patient
router.post(
  "/",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  createPatient,
);

// Get patient by ID
router.get("/:id", verifyToken, getPatient);

// Update patient
router.put(
  "/:id",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  updatePatient,
);

// Get patient audit logs
router.get(
  "/:patientId/audits",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  getPatientAudits,
);

export default router;
