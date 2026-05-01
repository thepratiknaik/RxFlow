import express from "express";
import {
  approvePrescriptionEtIn,
  createPrescriptionEntry,
  createPrescriptionManual,
  dispensePrescription,
  getPrescription,
  listPrescriptions,
  markPrescriptionCompleted,
  patchPrescriptionInsurance,
  syncFhirPrescriptions,
} from "../controllers/prescriptionController.js";
import { sendPrescriptionForReview } from "../controllers/prescriptionReviewController.js";
import {
  authorize,
  authorizePharmacistOnly,
  verifyToken,
} from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/prescriptions",
  module: "Prescriptions",
};

router.get("/", verifyToken, listPrescriptions);

router.post(
  "/fhir/sync",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  syncFhirPrescriptions,
);

router.post(
  "/",
  verifyToken,
  authorize(["user", "pharmacist", "admin"]),
  createPrescriptionManual,
);

router.post(
  "/entry",
  verifyToken,
  authorize(["user", "pharmacist", "admin"]),
  createPrescriptionEntry,
);

router.post(
  "/:id/send-for-review",
  verifyToken,
  authorize(["user", "pharmacist", "admin"]),
  sendPrescriptionForReview,
);

router.post(
  "/:id/approve-et-in",
  verifyToken,
  authorizePharmacistOnly,
  approvePrescriptionEtIn,
);

router.post(
  "/:id/dispense",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  dispensePrescription,
);

router.post(
  "/:id/complete-pickup",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  markPrescriptionCompleted,
);

router.patch(
  "/:id/insurance",
  verifyToken,
  authorize(["user", "pharmacist", "admin"]),
  patchPrescriptionInsurance,
);
router.put(
  "/:id/insurance",
  verifyToken,
  authorize(["user", "pharmacist", "admin"]),
  patchPrescriptionInsurance,
);

router.get("/:id", verifyToken, getPrescription);

export default router;
