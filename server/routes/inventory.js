import express from "express";
import {
  createInventoryLot,
  deleteInventoryLot,
  listInventoryLots,
  updateInventoryLot,
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

router.patch(
  "/lots/:id",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  updateInventoryLot,
);

router.delete(
  "/lots/:id",
  verifyToken,
  authorize(["pharmacist", "admin"]),
  deleteInventoryLot,
);

export default router;
