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

const ddlPath = path.join(__dirname, "..", "models", "schema", "schema_ddl.sql");
const adminDatabaseName = process.env.DB_ROOT_DATABASE || "postgres";

const quoteIdentifier = (value) => `"${String(value || "").replace(/"/g, "\"\"")}"`;
const quoteLiteral = (value) => `'${String(value || "").replace(/'/g, "''")}'`;

const createAdminSequelize = (databaseName = adminDatabaseName) =>
  new Sequelize(
    databaseName,
    process.env.DB_ROOT_USER,
    process.env.DB_ROOT_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      dialectOptions,
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        max: 2,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  );

const getDdlContents = () => fs.readFileSync(ddlPath, "utf8");

const getExpectedTablesFromDdl = (ddl) => {
  const matches = ddl.matchAll(
    /CREATE TABLE\s+(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))\s*\(/g,
  );

  return [...new Set(
    [...matches].map((match) => match[1] || match[2]).filter(Boolean),
  )];
};

const getExistingPublicTables = async () =>
  await sequelize.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `,
    { type: Sequelize.QueryTypes.SELECT },
  );

const validatePrescriptionReviewTokenFk = async () => {
  const rows = await sequelize.query(
    `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'prescription_review_tokens'
    `,
    { type: Sequelize.QueryTypes.SELECT },
  );

  return rows.some(
    (row) =>
      row.column_name === "prescription_id" &&
      row.foreign_table_name === "prescription" &&
      row.foreign_column_name === "prescription_id",
  );
};

const ensureDatabaseAndRole = async () => {
  if (!process.env.DB_ROOT_USER || !process.env.DB_ROOT_PASSWORD) {
    return;
  }

  const targetDbName = String(process.env.DB_NAME || "").trim();
  const targetDbUser = String(process.env.DB_USER || "").trim();
  const targetDbPassword = String(process.env.DB_PASSWORD || "");

  if (!targetDbName || !targetDbUser) {
    throw new Error(
      "DB_NAME and DB_USER are required when using DB_ROOT_USER/DB_ROOT_PASSWORD bootstrap.",
    );
  }

  const adminSequelize = createAdminSequelize();

  try {
    await adminSequelize.authenticate();
    console.log(`PostgreSQL admin bootstrap connected to ${process.env.DB_HOST}/${adminDatabaseName}`);

    const existingRole = await adminSequelize.query(
      `SELECT 1 AS exists FROM pg_roles WHERE rolname = :roleName LIMIT 1`,
      {
        replacements: { roleName: targetDbUser },
        type: Sequelize.QueryTypes.SELECT,
        plain: true,
      },
    );

    if (!existingRole) {
      await adminSequelize.query(
        `CREATE ROLE ${quoteIdentifier(targetDbUser)} WITH LOGIN PASSWORD ${quoteLiteral(targetDbPassword)}`,
      );
      console.log(`Created PostgreSQL role ${targetDbUser}.`);
    } else {
      await adminSequelize.query(
        `ALTER ROLE ${quoteIdentifier(targetDbUser)} WITH LOGIN PASSWORD ${quoteLiteral(targetDbPassword)}`,
      );
    }

    const existingDatabase = await adminSequelize.query(
      `SELECT 1 AS exists FROM pg_database WHERE datname = :dbName LIMIT 1`,
      {
        replacements: { dbName: targetDbName },
        type: Sequelize.QueryTypes.SELECT,
        plain: true,
      },
    );

    if (!existingDatabase) {
      await adminSequelize.query(
        `CREATE DATABASE ${quoteIdentifier(targetDbName)} OWNER ${quoteIdentifier(targetDbUser)}`,
      );
      console.log(`Created PostgreSQL database ${targetDbName}.`);
    }
  } finally {
    await adminSequelize.close();
  }

  const adminDbSequelize = createAdminSequelize(targetDbName);
  try {
    await adminDbSequelize.authenticate();
    await adminDbSequelize.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdentifier(targetDbName)} TO ${quoteIdentifier(targetDbUser)}`,
    );
    await adminDbSequelize.query(
      `GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(targetDbUser)}`,
    );
    await adminDbSequelize.query(
      `ALTER SCHEMA public OWNER TO ${quoteIdentifier(targetDbUser)}`,
    );
  } finally {
    await adminDbSequelize.close();
  }
};

const ensureSchemaFromDdl = async () => {
  const ddl = getDdlContents();
  const expectedTables = getExpectedTablesFromDdl(ddl);
  const existingTables = (await getExistingPublicTables()).map(
    (row) => row.table_name,
  );
  const existingTableSet = new Set(existingTables);
  const missingTables = expectedTables.filter(
    (tableName) => !existingTableSet.has(tableName),
  );
  const hasAllExpectedTables = missingTables.length === 0;
  const hasAnyExpectedTable = expectedTables.some((tableName) =>
    existingTableSet.has(tableName),
  );

  if (hasAllExpectedTables) {
    console.log("DDL bootstrap skipped: all expected tables already exist.");
  } else if (!hasAnyExpectedTable) {
    console.log("DDL bootstrap starting: connected database is empty or legacy-only.");
    await sequelize.query(ddl);
    console.log("DDL bootstrap completed.");
  } else {
    throw new Error(
      [
        "Connected database partially matches the DDL and was not auto-modified.",
        `Missing tables: ${missingTables.join(", ")}`,
        "Use a fresh database name in DB_NAME, or rename/drop the old database before starting the server.",
      ].join(" "),
    );
  }

  const tablesAfterBootstrap = (await getExistingPublicTables()).map(
    (row) => row.table_name,
  );
  const missingAfterBootstrap = expectedTables.filter(
    (tableName) => !tablesAfterBootstrap.includes(tableName),
  );

  if (missingAfterBootstrap.length) {
    throw new Error(
      `DDL validation failed. Missing tables after bootstrap: ${missingAfterBootstrap.join(", ")}`,
    );
  }

  const hasPrescriptionReviewTokenTable = tablesAfterBootstrap.includes(
    "prescription_review_tokens",
  );
  if (
    hasPrescriptionReviewTokenTable &&
    !(await validatePrescriptionReviewTokenFk())
  ) {
    throw new Error(
      "DDL validation failed. prescription_review_tokens is missing the foreign key to prescription(prescription_id).",
    );
  }

  const extraTables = tablesAfterBootstrap.filter(
    (tableName) => !expectedTables.includes(tableName),
  );

  if (extraTables.length) {
    console.warn(
      `Database contains extra tables not defined in the DDL: ${extraTables.join(", ")}`,
    );
  }
};

const ensureDefaultPharmacy = async () => {
  const activeStatusResult = await sequelize.query(
    `SELECT id FROM pharmacy_status WHERE lower(status) = 'active' LIMIT 1`,
  );
  const activeStatusId = activeStatusResult?.[0]?.[0]?.id;

  if (!activeStatusId) {
    throw new Error("Active pharmacy status is missing from pharmacy_status.");
  }

  const pharmacyResult = await sequelize.query(
    `SELECT pharmacy_id FROM pharmacy ORDER BY pharmacy_id ASC LIMIT 1`,
  );
  const existingPharmacyId = pharmacyResult?.[0]?.[0]?.pharmacy_id;

  if (existingPharmacyId) {
    return existingPharmacyId;
  }

  const insertResult = await sequelize.query(
    `
      INSERT INTO pharmacy (name, license_number, subscription_tier, status_id)
      VALUES ('RxFlow Demo Pharmacy', 'RXFLOW-DEMO-LICENSE', 'Standard', ${Number(activeStatusId)})
      RETURNING pharmacy_id
    `,
  );

  return insertResult?.[0]?.[0]?.pharmacy_id || null;
};

const connectDB = async () => {
  try {
    await ensureDatabaseAndRole();
    await sequelize.authenticate();
    console.log(`PostgreSQL Connected: ${process.env.DB_HOST}`);

    await ensureSchemaFromDdl();
    await ensureDefaultPharmacy();
    console.log("Database ready using strict DDL tables");

    return sequelize;
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
export { sequelize };
