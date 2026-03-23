import { Op } from "sequelize";
import Drug from "../models/Drug.js";
import DrugPullAudit from "../models/DrugPullAudit.js";
import {
  addDrugPullJob,
  checkRedisHealth,
  getDrugPullJob,
} from "../queues/drugPullQueue.js";

const toLimit = (value, fallback = 25, max = 100) =>
  Math.min(Math.max(Number(value) || fallback, 1), max);

export const pullDrugs = async (req, res) => {
  try {
    const redisHealthy = await checkRedisHealth();

    if (!redisHealthy) {
      return res.status(503).json({
        success: false,
        message:
          "Queue infrastructure is not available. Ensure Redis is running and reachable.",
      });
    }

    const searchTerm = req.body?.searchTerm || req.query?.searchTerm || "";
    const limit = toLimit(req.body?.limit || req.query?.limit, 25, 100);

    const audit = await DrugPullAudit.create({
      status: "queued",
      searchterm: searchTerm,
      requestedlimit: limit,
      requestedbyuserid: req.user?.id || null,
    });

    const job = await addDrugPullJob({
      auditId: audit.id,
      searchTerm,
      limit,
    });

    await audit.update({ jobid: String(job.id) });

    return res.status(202).json({
      success: true,
      message: "Drug pull job queued successfully.",
      data: {
        auditId: audit.id,
        jobId: String(job.id),
        searchTerm,
        requestedLimit: limit,
        status: "queued",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to queue drug pull job.",
    });
  }
};

export const getDrugPullStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getDrugPullJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const state = await job.getState();
    const audit = await DrugPullAudit.findOne({
      where: { jobid: String(job.id) },
    });

    return res.status(200).json({
      success: true,
      data: {
        jobId: String(job.id),
        state,
        progress: job.progress || 0,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason || null,
        result: job.returnvalue || null,
        audit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get job status.",
    });
  }
};

export const listDrugPullAudits = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 20, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);

    const { rows, count } = await DrugPullAudit.findAndCountAll({
      limit,
      offset: (page - 1) * limit,
      order: [["createdat", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list drug pull audits.",
    });
  }
};

export const listDrugs = async (req, res) => {
  try {
    const limit = toLimit(req.query?.limit, 20, 100);
    const page = Math.max(Number(req.query?.page) || 1, 1);
    const search = String(req.query?.search || "").trim();

    const where = search
      ? {
          [Op.or]: [
            { genericname: { [Op.iLike]: `%${search}%` } },
            { brandname: { [Op.iLike]: `%${search}%` } },
            { productndc: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { rows, count } = await Drug.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["updatedat", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(Math.ceil(count / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to list drugs.",
    });
  }
};
