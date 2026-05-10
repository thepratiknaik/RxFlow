import dotenv from "dotenv";
import connectDB, { sequelize } from "./config/db.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    console.log("Schema check completed successfully.");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("Schema check failed:", error.message);
    try {
      await sequelize.close();
    } catch {
      // Ignore close errors during failure cleanup.
    }
    process.exit(1);
  }
};

run();
