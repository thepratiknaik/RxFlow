import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import connectDB, { sequelize as appSequelize } from "./config/db.js";

dotenv.config();

const dialectOptions = {};

const quoteIdentifier = (value) => `"${String(value || "").replace(/"/g, "\"\"")}"`;
const quoteLiteral = (value) => `'${String(value || "").replace(/'/g, "''")}'`;

const createAdminSequelize = (databaseName) =>
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
    },
  );

const getBackupDatabaseName = (dbName) => {
  const now = new Date();
  const parts = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ];

  return `${dbName}_legacy_${parts.join("")}`;
};

const ensureRole = async (adminSequelize, roleName, rolePassword) => {
  const existingRole = await adminSequelize.query(
    `SELECT 1 AS exists FROM pg_roles WHERE rolname = :roleName LIMIT 1`,
    {
      replacements: { roleName },
      type: Sequelize.QueryTypes.SELECT,
      plain: true,
    },
  );

  if (!existingRole) {
    await adminSequelize.query(
      `CREATE ROLE ${quoteIdentifier(roleName)} WITH LOGIN PASSWORD ${quoteLiteral(rolePassword)}`,
    );
    return "created";
  }

  await adminSequelize.query(
    `ALTER ROLE ${quoteIdentifier(roleName)} WITH LOGIN PASSWORD ${quoteLiteral(rolePassword)}`,
  );
  return "updated";
};

const recreateDatabase = async () => {
  const adminDatabase = process.env.DB_ROOT_DATABASE || "postgres";
  const dbName = String(process.env.DB_NAME || "").trim();
  const dbUser = String(process.env.DB_USER || "").trim();
  const dbPassword = String(process.env.DB_PASSWORD || "");

  if (!process.env.DB_ROOT_USER || !process.env.DB_ROOT_PASSWORD) {
    throw new Error("DB_ROOT_USER and DB_ROOT_PASSWORD are required for db reset.");
  }

  if (!dbName || !dbUser) {
    throw new Error("DB_NAME and DB_USER are required for db reset.");
  }

  const adminSequelize = createAdminSequelize(adminDatabase);

  try {
    await adminSequelize.authenticate();
    const roleStatus = await ensureRole(adminSequelize, dbUser, dbPassword);
    console.log(`App role ${dbUser} ${roleStatus}.`);

    const existingDatabase = await adminSequelize.query(
      `SELECT 1 AS exists FROM pg_database WHERE datname = :dbName LIMIT 1`,
      {
        replacements: { dbName },
        type: Sequelize.QueryTypes.SELECT,
        plain: true,
      },
    );

    if (existingDatabase) {
      const backupName = getBackupDatabaseName(dbName);

      await adminSequelize.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = :dbName
            AND pid <> pg_backend_pid()
        `,
        {
          replacements: { dbName },
          type: Sequelize.QueryTypes.SELECT,
        },
      );

      await adminSequelize.query(
        `ALTER DATABASE ${quoteIdentifier(dbName)} RENAME TO ${quoteIdentifier(backupName)}`,
      );
      console.log(`Renamed existing database ${dbName} to ${backupName}.`);
    }

    await adminSequelize.query(
      `CREATE DATABASE ${quoteIdentifier(dbName)} OWNER ${quoteIdentifier(dbUser)}`,
    );
    console.log(`Created fresh database ${dbName}.`);
  } finally {
    await adminSequelize.close();
  }

  const adminDbSequelize = createAdminSequelize(dbName);
  try {
    await adminDbSequelize.authenticate();
    await adminDbSequelize.query(
      `GRANT ALL PRIVILEGES ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(dbUser)}`,
    );
    await adminDbSequelize.query(
      `GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(dbUser)}`,
    );
    await adminDbSequelize.query(
      `ALTER SCHEMA public OWNER TO ${quoteIdentifier(dbUser)}`,
    );
  } finally {
    await adminDbSequelize.close();
  }
};

const run = async () => {
  try {
    await recreateDatabase();
    await connectDB();
    console.log("Database reset and DDL bootstrap completed successfully.");
    await appSequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("Database reset failed:", error.message);
    try {
      await appSequelize.close();
    } catch {
      // Ignore cleanup errors.
    }
    process.exit(1);
  }
};

run();
