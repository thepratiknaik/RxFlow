import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";

// Load environment variables FIRST
dotenv.config();

import connectDB from "./config/db.js";
import { buildApiDocs } from "./docs/apiDocs.js";
import "./models/User.js";
import "./models/Drug.js";
import "./models/DrugPullAudit.js";
import "./models/Patient.js";
import "./models/PatientAudit.js"; // This imports PatientAuditLog
import "./models/Prescription.js";
import "./models/InventoryLot.js";
import { startDrugPullWorker } from "./workers/drugPullWorker.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toTitle = (value) =>
  value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const loadRouteModules = async () => {
  const routesDir = path.join(__dirname, "routes");
  const routeFiles = (await fs.readdir(routesDir))
    .filter((fileName) => fileName.endsWith(".js"))
    .sort();

  const modules = [];

  for (const fileName of routeFiles) {
    const routeModulePath = path.join(routesDir, fileName);
    const importedModule = await import(pathToFileURL(routeModulePath).href);

    if (!importedModule?.default?.stack) {
      continue;
    }

    const fileNameWithoutExtension = path.basename(fileName, ".js");
    const routeConfig = importedModule.routeConfig || {};

    modules.push({
      module: routeConfig.module || toTitle(fileNameWithoutExtension),
      basePath: routeConfig.basePath || `/api/${fileNameWithoutExtension}`,
      router: importedModule.default,
    });
  }

  return modules;
};

// Connect to PostgreSQL and start server
const startServer = async () => {
  try {
    await connectDB();
    startDrugPullWorker();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Static files for docs UI
    app.use(express.static(path.join(__dirname, "public")));

    // Routes
    // Serve UI assets from the server package so they are available in Docker images.
    app.use("/assets", express.static(path.join(__dirname, "assets")));

    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // Health check endpoint
    app.get("/api/health", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
      });
    });

    const routeModules = await loadRouteModules();

    routeModules.forEach((routeModule) => {
      app.use(routeModule.basePath, routeModule.router);
    });

    const docsPayload = buildApiDocs({
      routeModules,
      additionalEndpoints: [
        {
          module: "Core",
          method: "GET",
          path: "/api/health",
          name: "Health Check",
          description:
            "Confirms that the API is running and returns a server timestamp.",
          authRequired: false,
        },
        {
          module: "Core",
          method: "GET",
          path: "/api/docs",
          name: "API Docs JSON",
          description:
            "Returns the generated endpoint documentation payload for the docs UI.",
          authRequired: false,
        },
      ],
    });

    // Public docs endpoint
    app.get("/api/docs", (req, res) => {
      res.status(200).json(docsPayload);
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error("Error:", err);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(
        `Route modules loaded: ${routeModules.map((module) => module.basePath).join(", ")}`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
