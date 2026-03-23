import express from "express";
import {
  getDrugPullStatus,
  listDrugPullJobsStatus,
  listDrugPullAudits,
  listDrugs,
  pullDrugs,
} from "../controllers/drugController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/drugs",
  module: "Drugs",
};

router.get("/", verifyToken, listDrugs);
router.get(
  "/pull-jobs",
  verifyToken,
  authorize(["admin", "pharmacist"]),
  listDrugPullJobsStatus,
);
router.get(
  "/pull-jobs/:jobId",
  verifyToken,
  authorize(["admin", "pharmacist"]),
  getDrugPullStatus,
);
router.get(
  "/pull-audits",
  verifyToken,
  authorize(["admin", "pharmacist"]),
  listDrugPullAudits,
);
router.post(
  "/pull",
  verifyToken,
  authorize(["admin", "pharmacist"]),
  pullDrugs,
);

export default router;
