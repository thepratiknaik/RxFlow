import { Worker } from "bullmq";
import DrugPullAudit from "../models/DrugPullAudit.js";
import {
  DRUG_PULL_QUEUE_NAME,
  redisConnection,
} from "../queues/drugPullQueue.js";
import { pullAndUpsertDrugs } from "../services/drugPullService.js";

let workerInstance = null;

const processDrugPullJob = async (job) => {
  const { auditId, searchTerm = "", limit = 25 } = job.data || {};

  const audit = await DrugPullAudit.findByPk(auditId);
  if (!audit) {
    throw new Error("Audit row not found for queued job.");
  }

  await audit.update({
    status: "processing",
    startedat: new Date(),
    errormessage: null,
  });

  try {
    const summary = await pullAndUpsertDrugs({ searchTerm, limit });

    await audit.update({
      status: "completed",
      sourcetotalmatches: summary.sourceTotalMatches,
      pulled: summary.pulled,
      inserted: summary.inserted,
      updated: summary.updated,
      completedat: new Date(),
    });

    return {
      auditId,
      ...summary,
    };
  } catch (error) {
    await audit.update({
      status: "failed",
      errormessage: error.message || "Drug pull failed.",
      completedat: new Date(),
    });

    throw error;
  }
};

export const startDrugPullWorker = () => {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = new Worker(DRUG_PULL_QUEUE_NAME, processDrugPullJob, {
    connection: redisConnection,
    concurrency: Number(process.env.DRUG_PULL_WORKER_CONCURRENCY || 1),
  });

  workerInstance.on("ready", () => {
    console.log("Drug pull worker is ready.");
  });

  workerInstance.on("completed", (job) => {
    console.log(`Drug pull job completed: ${job.id}`);
  });

  workerInstance.on("failed", (job, error) => {
    console.error(`Drug pull job failed: ${job?.id}`, error.message);
  });

  workerInstance.on("error", (error) => {
    console.error("Drug pull worker error:", error.message);
  });

  return workerInstance;
};

export const getDrugPullWorker = () => workerInstance;
