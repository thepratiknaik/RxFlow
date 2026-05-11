import { Worker } from "bullmq";
import {
  DRUG_PULL_QUEUE_NAME,
  redisConnection,
} from "../queues/drugPullQueue.js";
import { pullAndUpsertDrugs } from "../services/drugPullService.js";

let workerInstance = null;

const processDrugPullJob = async (job) => {
  const { searchTerm = "", limit = 25 } = job.data || {};
  return await pullAndUpsertDrugs({ searchTerm, limit });
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
