import express from "express";
import { listAuditLogs } from "../controllers/auditLogController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/audit-logs",
  module: "Audit Logs",
};

router.get(
  "/",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  listAuditLogs,
);

export default router;
