import express from "express";
import {
  generateSubscriptionInvoice,
  getSubscriptionInvoice,
  listSubscriptionInvoices,
} from "../controllers/billingController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/billing",
  module: "Billing",
};

router.post(
  "/subscription-invoices/generate",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  generateSubscriptionInvoice,
);
router.get(
  "/subscription-invoices",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  listSubscriptionInvoices,
);
router.get(
  "/subscription-invoices/:id",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  getSubscriptionInvoice,
);

export default router;
