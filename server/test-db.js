import dotenv from "dotenv";
import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const testConnection = async () => {
  try {
    console.log("Testing PostgreSQL connection...");
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`User: ${process.env.DB_USER}`);

    const dialectOptions = {};

    // Add SSL configuration for AWS RDS
    if (
      process.env.DB_HOST &&
      process.env.DB_HOST.includes("rds.amazonaws.com")
    ) {
      console.log("Using SSL for AWS RDS connection");
      dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: false,
      };

      // Add certificate if available
      const certPath = path.join(__dirname, "certs", "global-bundle.pem");
      if (fs.existsSync(certPath)) {
        console.log("Using certificate file");
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
        logging: false,
      },
    );

    await sequelize.authenticate();
    console.log("✓ Connection has been established successfully.");

    // Test a simple query
    const result = await sequelize.query("SELECT version()");
    console.log("✓ PostgreSQL version:", result[0][0].version);

    await sequelize.close();
    console.log("✓ Connection closed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Unable to connect to the database:");
    console.error(error.message);
    process.exit(1);
  }
};

testConnection();
