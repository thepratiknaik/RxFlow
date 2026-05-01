/**
 * Creates idempotent demo inventory lots for QA / lot traceability.
 * Run from the server directory: npm run seed:demo-lots
 * Requires drugs in the catalog (use Inventory → Pull drug catalog first).
 */
import dotenv from "dotenv";

dotenv.config();

import { sequelize } from "../config/db.js";
import Drug from "../models/Drug.js";
import InventoryLot from "../models/InventoryLot.js";

const main = async () => {
  await sequelize.authenticate();

  const drugs = await Drug.findAll({
    limit: 20,
    order: [["createdat", "ASC"]],
  });

  if (!drugs.length) {
    console.error("No drugs found. Pull the drug catalog from Inventory, then run this again.");
    await sequelize.close();
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < drugs.length; i += 1) {
    const drug = drugs[i];
    const lotNumber = `LOT-2026-DEMO-${String(i + 1).padStart(2, "0")}`;

    const [, wasCreated] = await InventoryLot.findOrCreate({
      where: { drugId: drug.id, lotNumber },
      defaults: {
        expiryDate: "2027-12-31",
        quantityOnHand: 100,
        minimumLevel: 10,
      },
    });

    if (wasCreated) {
      created += 1;
      console.log(`Created ${lotNumber} for NDC ${drug.productndc || drug.id}`);
    } else {
      skipped += 1;
      console.log(`Skip (exists) ${lotNumber} for NDC ${drug.productndc || drug.id}`);
    }
  }

  console.log(`\nDone. Created: ${created}, already present: ${skipped}.`);
  console.log("Try lot traceability with e.g. LOT-2026-DEMO-01 or DEMO-01 (partial match).");
  await sequelize.close();
  process.exit(0);
};

main().catch(async (err) => {
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
