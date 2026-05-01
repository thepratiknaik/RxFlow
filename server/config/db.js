import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Sequelize instance at module load
const dialectOptions = {};

// Add SSL configuration for AWS RDS
if (process.env.DB_HOST && process.env.DB_HOST.includes("rds.amazonaws.com")) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };

  // Add certificate if available
  const certPath = path.join(__dirname, "..", "certs", "global-bundle.pem");
  if (fs.existsSync(certPath)) {
    dialectOptions.ssl.ca = fs.readFileSync(certPath).toString();
  }
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    dialectOptions,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

/**
 * sequelize.sync({ alter: false }) does not add new columns to existing tables.
 * Lot traceability queries need prescription dispense columns present on older DBs.
 */
const ensurePrescriptionDispenseColumns = async () => {
  if (sequelize.getDialect() !== "postgres") {
    return;
  }
  const statements = [
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS "dispensedLotId" UUID`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS "dispensedLotNumber" VARCHAR(255)`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS "dispensedQuantity" INTEGER`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS "dispensedAt" TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS "dispensedByUserId" UUID`,
  ];
  for (const sql of statements) {
    await sequelize.query(sql);
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`PostgreSQL Connected: ${process.env.DB_HOST}`);

    // Sync models with database
    await sequelize.sync({ alter: false });
    await ensurePrescriptionDispenseColumns();
    console.log("Database synchronized");

    return sequelize;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
export { sequelize };
