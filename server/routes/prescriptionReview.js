import express from "express";
import {
  approvePrescriptionReview,
  getPrescriptionReview,
  rejectPrescriptionReview,
} from "../controllers/prescriptionReviewController.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/prescriptions/review",
  module: "Prescription Review",
};

router.get("/:token", getPrescriptionReview);
router.post("/:token/approve", approvePrescriptionReview);
router.post("/:token/reject", rejectPrescriptionReview);

export default router;
