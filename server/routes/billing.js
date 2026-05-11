import express from "express";
import {
  getPlans,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  listInvoices,
  handleWebhook,
} from "../controllers/billingController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/billing",
  module: "Billing",
};

// Stripe webhook — no auth, raw body required (see server/index.js)
router.post("/webhook", handleWebhook);

// Authenticated billing routes — admin only
router.get("/plans", getPlans);
router.get(
  "/subscription",
  verifyToken,
  authorize(["admin"]),
  getSubscription,
);
router.post(
  "/checkout",
  verifyToken,
  authorize(["admin"]),
  createCheckoutSession,
);
router.post(
  "/portal",
  verifyToken,
  authorize(["admin"]),
  createPortalSession,
);
router.get(
  "/invoices",
  verifyToken,
  authorize(["admin"]),
  listInvoices,
);

export default router;
