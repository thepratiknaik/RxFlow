import { Op } from "sequelize";
import Prescription from "../models/Prescription.js";
import PrescriptionReviewToken from "../models/PrescriptionReviewToken.js";
import Patient from "../models/Patient.js";
import Prescriber from "../models/Prescriber.js";
import {
  createPrescriptionReviewInvite,
  hashReviewToken,
} from "../services/prescriptionNotificationService.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";

const REVIEW_DECISION_STATUS = {
  approved: "in_process",
  rejected: "cancelled",
};

const getSafePrescriberInfo = async (prescription) => {
  const rawMeta = prescription?.fhirRaw || {};
  const prescriberCode = rawMeta?.prescriber_id || null;

  if (!prescriberCode) {
    return null;
  }

  const prescriber = await Prescriber.findOne({
    where: {
      [Op.or]: [{ npi: prescriberCode }, { email: prescriberCode }],
    },
  });

  return prescriber
    ? {
        id: prescriber.id,
        name: prescriber.name,
        contact: prescriber.contact,
        email: prescriber.email,
        npi: prescriber.npi,
      }
    : {
        name: prescriberCode,
        contact: null,
        email: null,
        npi: prescriberCode,
      };
};

const buildReviewPayload = async (prescription, tokenRecord) => {
  const patient = prescription.patient;
  const prescriber = await getSafePrescriberInfo(prescription);
  const reviewState = tokenRecord
    ? {
        id: tokenRecord.id,
        expiresAt: tokenRecord.expiresAt,
        usedAt: tokenRecord.usedAt,
        decision: tokenRecord.decision,
      }
    : null;

  return {
    prescription: {
      id: prescription.id,
      prescriptionNumber: prescription.prescriptionNumber,
      medicationDisplay: prescription.medicationDisplay,
      quantityValue: prescription.quantityValue,
      status: prescription.status,
      createdAt: prescription.createdat,
      patient: patient
        ? {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            patientNumber: patient.patientNumber,
            mrn: patient.mrn,
          }
        : null,
      prescriber,
    },
    reviewState,
  };
};

const resolvePrescriptionSummary = (prescription) => {
  const rawMeta = prescription?.fhirRaw || {};
  return {
    medicationDisplay: prescription?.medicationDisplay || "N/A",
    quantityValue: prescription?.quantityValue ?? null,
    patientName: prescription?.patient
      ? `${prescription.patient.firstName || ""} ${prescription.patient.lastName || ""}`.trim()
      : "N/A",
    prescriberLabel: rawMeta?.prescriber_id || "Prescriber",
  };
};

const loadTokenAndPrescription = async (token) => {
  const tokenHash = hashReviewToken(token);
  const tokenRecord = await PrescriptionReviewToken.findOne({
    where: { tokenHash },
  });

  if (!tokenRecord) {
    return { tokenRecord: null, prescription: null };
  }

  const prescription = await Prescription.findByPk(tokenRecord.prescriptionId, {
    include: [
      {
        model: Patient,
        as: "patient",
        required: false,
      },
    ],
  });

  return { tokenRecord, prescription };
};

const reviewTokenIsExpired = (tokenRecord) => {
  if (!tokenRecord?.expiresAt) {
    return false;
  }

  return new Date(tokenRecord.expiresAt).getTime() < Date.now();
};

export const getPrescriptionReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { tokenRecord, prescription } = await loadTokenAndPrescription(token);

    if (!tokenRecord || !prescription) {
      return res.status(404).json({
        success: false,
        message: "Review link not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...(await buildReviewPayload(prescription, tokenRecord)),
        tokenExpired: reviewTokenIsExpired(tokenRecord),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load prescription review.",
    });
  }
};

const performReviewDecision = async (req, res, decision) => {
  const transaction = await Prescription.sequelize.transaction();

  try {
    const { token } = req.params;
    const { tokenRecord, prescription } = await loadTokenAndPrescription(token);

    if (!tokenRecord || !prescription) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Review link not found.",
      });
    }

    if (reviewTokenIsExpired(tokenRecord)) {
      await transaction.rollback();
      return res.status(410).json({
        success: false,
        message: "This review link has expired.",
      });
    }

    if (tokenRecord.usedAt) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "This review link has already been used.",
      });
    }

    const nextStatus = REVIEW_DECISION_STATUS[decision];
    const resolvedPrescriber = await getSafePrescriberInfo(prescription);
    const approvedByName =
      resolvedPrescriber?.name ||
      tokenRecord.recipientName ||
      tokenRecord.recipientEmail ||
      (prescription.fhirRaw || {}).verified_by ||
      null;

    await prescription.update(
      {
        status: nextStatus,
        fhirRaw: {
          ...(prescription.fhirRaw || {}),
          verified_by:
            decision === "approved"
              ? approvedByName
              : (prescription.fhirRaw || {}).verified_by || null,
          prescriberReview: {
            decision,
            reviewedAt: new Date().toISOString(),
            reviewedBy: tokenRecord.recipientEmail,
            reviewedByName:
              decision === "approved"
                ? approvedByName
                : tokenRecord.recipientName || resolvedPrescriber?.name || null,
          },
        },
      },
      { transaction },
    );

    await tokenRecord.update(
      {
        decision,
        usedAt: new Date(),
      },
      { transaction },
    );

    await transaction.commit();

    await writeAuditLog({
      entityType: "prescription_review",
      entityId: tokenRecord.id,
      action: decision,
      summary: `Prescription ${prescription.prescriptionNumber} was ${decision} by ${approvedByName || "prescriber"}.`,
      metadata: {
        prescriptionId: prescription.id,
        prescriptionNumber: prescription.prescriptionNumber,
        decision,
        recipientEmail: tokenRecord.recipientEmail,
        recipientName: approvedByName,
      },
      ...buildActorContext(req),
    });

    const refreshedPrescription = await Prescription.findByPk(prescription.id, {
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message:
        decision === "approved"
          ? "Prescription approved successfully."
          : "Prescription rejected successfully.",
      data: await buildReviewPayload(refreshedPrescription, tokenRecord),
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process prescription review.",
    });
  }
};

export const approvePrescriptionReview = async (req, res) =>
  performReviewDecision(req, res, "approved");

export const rejectPrescriptionReview = async (req, res) =>
  performReviewDecision(req, res, "rejected");

export const sendPrescriptionForReview = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findByPk(id, {
      include: [
        {
          model: Patient,
          as: "patient",
          required: false,
        },
      ],
    });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found.",
      });
    }

    if (prescription.status !== "new") {
      return res.status(400).json({
        success: false,
        message: "Only prescriptions in New status can be sent for review.",
      });
    }

    const summary = resolvePrescriptionSummary(prescription);
    const prescriber = await getSafePrescriberInfo(prescription);

    const invite = await createPrescriptionReviewInvite({
      prescriptionId: prescription.id,
      prescriberName: prescriber?.name || summary.prescriberLabel,
      prescriberEmail: prescriber?.email,
      prescriptionSummary: {
        medicationDisplay: summary.medicationDisplay,
        quantityValue: summary.quantityValue,
        patientName: summary.patientName,
      },
    });

    await writeAuditLog({
      entityType: "prescription_review",
      entityId: invite.reviewRecord.id,
      action: "sent",
      summary: `Sent prescription ${prescription.prescriptionNumber} for review to ${invite.reviewRecord.recipientName || invite.reviewRecord.recipientEmail}.`,
      metadata: {
        prescriptionId: prescription.id,
        prescriptionNumber: prescription.prescriptionNumber,
        recipientEmail: invite.reviewRecord.recipientEmail,
        recipientName: invite.reviewRecord.recipientName,
        deliveryMode: invite.deliveryMode,
      },
      ...buildActorContext(req),
    });

    return res.status(200).json({
      success: true,
      message:
        invite.deliveryMode === "smtp"
          ? "Prescription review email queued."
          : "Prescription review link generated locally. SMTP is not configured, so no email was sent.",
      data: {
        reviewUrl: invite.reviewUrl,
        deliveryMode: invite.deliveryMode,
        recipientEmail: invite.reviewRecord.recipientEmail,
        recipientName: invite.reviewRecord.recipientName,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send prescription for review.",
    });
  }
};
