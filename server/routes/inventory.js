import express from "express";
import {
  createInventoryLot,
  listInventoryLots,
} from "../controllers/inventoryController.js";
import { authorize, verifyToken } from "../middleware/auth.js";

const router = express.Router();

export const routeConfig = {
  basePath: "/api/inventory",
  module: "Inventory",
};

router.get("/lots", verifyToken, listInventoryLots);

router.post(
  "/lots",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  createInventoryLot,
);

export default router;
