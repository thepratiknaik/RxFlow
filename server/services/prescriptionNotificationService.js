import crypto from "crypto";
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

  const fallbackEmail = String(
    process.env.PRESCRIPTION_REVIEW_FALLBACK_EMAIL || DEFAULT_PRESCRIBER_EMAIL,
  )
    .trim()
    .toLowerCase();

  return fallbackEmail;
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

export const generateReviewToken = () => crypto.randomBytes(32).toString("hex");

export const hashReviewToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const buildReviewUrl = (token) => {
  const baseUrl = getFrontendBaseUrl();
  return `${baseUrl}/prescription-review?token=${encodeURIComponent(token)}`;
};

export const createPrescriptionReviewInvite = async ({
  prescriptionId,
  prescriberName,
  prescriberEmail,
  prescriptionSummary,
}) => {
  const token = generateReviewToken();
  const tokenHash = hashReviewToken(token);
  const expiresAt = new Date(Date.now() + getTokenTtlHours() * 60 * 60 * 1000);
  const reviewUrl = buildReviewUrl(token);
  const recipientEmail = resolveRecipientEmail(prescriberEmail);

  const reviewToken = await PrescriptionReviewToken.create({
    prescriptionId,
    tokenHash,
    recipientEmail,
    recipientName: prescriberName || "Prescriber",
    reviewUrl,
    sentAt: new Date(),
    expiresAt,
    usedAt: null,
    decision: null,
  });

  const subject = `Prescription review request for ${prescriberName || "Prescriber"}`;
  const text = [
    `A new prescription is ready for your review.`,
    "",
    `Prescriber: ${prescriberName || "Prescriber"}`,
    `Medication: ${prescriptionSummary?.medicationDisplay || "N/A"}`,
    `Quantity: ${prescriptionSummary?.quantityValue ?? "N/A"}`,
    `Patient: ${prescriptionSummary?.patientName || "N/A"}`,
    "",
    "Review link:",
    reviewUrl,
    "",
    "This link can be used once to approve or reject the prescription.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #102a43;">
      <h2 style="margin: 0 0 12px;">Prescription review request</h2>
      <p>A new prescription is ready for your review.</p>
      <ul>
        <li><strong>Prescriber:</strong> ${prescriberName || "Prescriber"}</li>
        <li><strong>Medication:</strong> ${prescriptionSummary?.medicationDisplay || "N/A"}</li>
        <li><strong>Quantity:</strong> ${prescriptionSummary?.quantityValue ?? "N/A"}</li>
        <li><strong>Patient:</strong> ${prescriptionSummary?.patientName || "N/A"}</li>
      </ul>
      <p>
        <a href="${reviewUrl}" style="display:inline-block;background:#1f9e89;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">
          Open Review Page
        </a>
      </p>
      <p style="color:#52606d;font-size:12px;">This link can be used once to approve or reject the prescription.</p>
    </div>
  `;

  const transporter = createTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || DEFAULT_SMTP_FROM,
      to: recipientEmail,
      subject,
      text,
      html,
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
    reviewToken,
    reviewUrl,
    deliveryMode: transporter ? "smtp" : "stub",
    reviewRecord: {
      id: reviewToken.id,
      recipientEmail: reviewToken.recipientEmail,
      recipientName: reviewToken.recipientName,
      expiresAt: reviewToken.expiresAt,
    },
  };
};

export const resolveReviewTokenRecord = async (token) => {
  const tokenHash = hashReviewToken(token);
  return await PrescriptionReviewToken.findOne({
    where: { tokenHash },
  });
};
