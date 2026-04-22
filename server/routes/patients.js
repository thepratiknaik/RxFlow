import express from "express";
import {
  searchPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientAudits,
  listPatientInsurances,
  addPatientInsurance,
  updatePatientInsurance,
  deletePatientInsurance,
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

// Delete patient
router.delete(
  "/:id",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  deletePatient,
);

// Get patient audit logs
router.get(
  "/:patientId/audits",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  getPatientAudits,
);

// List patient insurances
router.get("/:id/insurances", verifyToken, listPatientInsurances);

// Add insurance to patient
router.post(
  "/:id/insurances",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  addPatientInsurance,
);

// Update patient insurance
router.patch(
  "/:id/insurances/:insuranceId",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  updatePatientInsurance,
);
router.put(
  "/:id/insurances/:insuranceId",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  updatePatientInsurance,
);

// Delete patient insurance
router.delete(
  "/:id/insurances/:insuranceId",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  deletePatientInsurance,
);

export default router;
