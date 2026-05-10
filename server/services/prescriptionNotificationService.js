import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import PrescriptionReviewToken from "../models/PrescriptionReviewToken.js";

const DEFAULT_PRESCRIBER_EMAIL = "aditya.srivastava@pace.edu";
const DEFAULT_FRONTEND_BASE_URL = "http://localhost:3000";
const DEFAULT_TOKEN_TTL_HOURS = 72;
const DEFAULT_SMTP_FROM = "no-reply@rxlfow.example.com";

const getFrontendBaseUrl = () =>
  (process.env.CLIENT_APP_BASE_URL || DEFAULT_FRONTEND_BASE_URL).replace(
    /\/+$/,
    "",
  );

const getTokenTtlHours = () => {
  const value = Number(process.env.PRESCRIPTION_REVIEW_TOKEN_TTL_HOURS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TOKEN_TTL_HOURS;
};

const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST);

const resolveRecipientEmail = (prescriberEmail) => {
  const normalizedPrescriberEmail = String(prescriberEmail || "")
    .trim()
    .toLowerCase();

  if (normalizedPrescriberEmail) {
    return normalizedPrescriberEmail;
  }

  return String(
    process.env.PRESCRIPTION_REVIEW_FALLBACK_EMAIL || DEFAULT_PRESCRIBER_EMAIL,
  )
    .trim()
    .toLowerCase();
};

const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });
};

const hashReviewToken = (token) =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const mapReviewRecord = (record) => {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    prescriptionId: record.prescriptionId,
    recipientEmail: record.recipientEmail || null,
    recipientName: record.recipientName || null,
    reviewUrl: record.reviewUrl || null,
    sentAt: record.sentAt || null,
    expiresAt: record.expiresAt || null,
    usedAt: record.usedAt || null,
    decision: record.decision || null,
  };
};

export const getReviewStatus = (record, now = new Date()) => {
  if (!record) {
    return "not_sent";
  }

  if (record.decision === "approved") {
    return "approved";
  }

  if (record.decision === "rejected") {
    return "rejected";
  }

  if (record.usedAt) {
    return "completed";
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < now.getTime()) {
    return "expired";
  }

  return "pending";
};

export const generateReviewToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${getTokenTtlHours()}h`,
  });

export const buildReviewUrl = (token) => {
  const baseUrl = getFrontendBaseUrl();
  return `${baseUrl}/prescription-review?token=${encodeURIComponent(token)}`;
};

export const listPrescriptionReviewRecords = async (prescriptionId) => {
  const rows = await PrescriptionReviewToken.findAll({
    where: { prescriptionId: Number(prescriptionId) },
    order: [["createdat", "DESC"]],
  });

  return rows.map(mapReviewRecord);
};

export const buildPrescriptionReviewSummary = (records) => {
  if (!records.length) {
    return {
      hasBeenSent: false,
      totalSent: 0,
      latestStatus: "not_sent",
      latestDecision: null,
      latestSentAt: null,
      latestReviewedAt: null,
    };
  }

  const latest = records[0];
  return {
    hasBeenSent: true,
    totalSent: records.length,
    latestStatus: getReviewStatus(latest),
    latestDecision: latest.decision || null,
    latestSentAt: latest.sentAt || null,
    latestReviewedAt: latest.usedAt || null,
  };
};

export const resolveReviewTokenRecord = async (token) => {
  const decoded = jwt.verify(String(token || ""), process.env.JWT_SECRET);
  const tokenHash = hashReviewToken(token);
  const record = await PrescriptionReviewToken.findOne({
    where: {
      prescriptionId: Number(decoded.prescriptionId),
      tokenHash,
    },
  });

  if (!record) {
    throw new Error("Review link not found.");
  }

  return mapReviewRecord(record);
};

export const markReviewTokenUsed = async ({ tokenRecordId, decision }) => {
  const record = await PrescriptionReviewToken.findByPk(tokenRecordId);
  if (!record) {
    throw new Error("Review link not found.");
  }

  record.usedAt = new Date();
  record.decision = decision;
  await record.save();

  return mapReviewRecord(record);
};

export const createPrescriptionReviewInvite = async ({
  prescriptionId,
  prescriberName,
  prescriberEmail,
  prescriptionSummary,
}) => {
  const recipientEmail = resolveRecipientEmail(prescriberEmail);
  const expiresAt = new Date(Date.now() + getTokenTtlHours() * 60 * 60 * 1000);
  const sentAt = new Date();

  const token = generateReviewToken({
    prescriptionId,
    recipientEmail,
    recipientName: prescriberName || "Prescriber",
    sentAt: sentAt.toISOString(),
  });
  const reviewUrl = buildReviewUrl(token);

  const reviewRecord = await PrescriptionReviewToken.create({
    prescriptionId: Number(prescriptionId),
    tokenHash: hashReviewToken(token),
    recipientEmail,
    recipientName: prescriberName || "Prescriber",
    reviewUrl,
    sentAt,
    expiresAt,
    usedAt: null,
    decision: null,
  });

  const subject = `Prescription review request for ${prescriberName || "Prescriber"}`;
  const text = [
    "A new prescription is ready for your review.",
    "",
    `Prescriber: ${prescriberName || "Prescriber"}`,
    `Medication: ${prescriptionSummary?.medicationDisplay || "N/A"}`,
    `Quantity: ${prescriptionSummary?.quantityValue ?? "N/A"}`,
    `Patient: ${prescriptionSummary?.patientName || "N/A"}`,
    "",
    "Review link:",
    reviewUrl,
  ].join("\n");

  const transporter = createTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || DEFAULT_SMTP_FROM,
      to: recipientEmail,
      subject,
      text,
      html: `<p>${text.replace(/\n/g, "<br/>")}</p>`,
    });
  } else {
    console.log("[Prescription email stub]", {
      to: recipientEmail,
      subject,
      reviewUrl,
      prescriptionId,
    });
  }

  return {
    reviewToken: {
      id: reviewRecord.id,
      recipientEmail,
      recipientName: prescriberName || "Prescriber",
      expiresAt,
    },
    reviewUrl,
    deliveryMode: transporter ? "smtp" : "stub",
    reviewRecord: mapReviewRecord(reviewRecord),
  };
};
