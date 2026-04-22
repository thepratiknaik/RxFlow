import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisConnection.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

const DRUG_PULL_QUEUE_NAME = "drug-pull-queue";

export const drugPullQueue = new Queue(DRUG_PULL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const addDrugPullJob = async (payload) =>
  drugPullQueue.add("pull-drugs", payload);

export const getDrugPullJob = async (jobId) => drugPullQueue.getJob(jobId);

export const listDrugPullJobs = async ({
  states = ["waiting", "active", "delayed", "completed", "failed"],
  start = 0,
  end = 99,
} = {}) => drugPullQueue.getJobs(states, start, end, true);

export const checkRedisHealth = async () => {
  try {
    const pong = await redisConnection.ping();
    return pong === "PONG";
  } catch (error) {
    return false;
  }
};

export { DRUG_PULL_QUEUE_NAME, redisConnection };
