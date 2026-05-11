import Prescription from "../models/Prescription.js";
import Patient from "../models/Patient.js";
import Prescriber from "../models/Prescriber.js";
import {
  getReviewStatus,
  markReviewTokenUsed,
  createPrescriptionReviewInvite,
  resolveReviewTokenRecord,
} from "../services/prescriptionNotificationService.js";
import {
  buildActorContext,
  writeAuditLog,
} from "../services/auditLogService.js";
import { getPrescriptionStatusId } from "../services/schemaCompatService.js";

const REVIEW_DECISION_STATUS = {
  approved: "in_process",
  rejected: "new",
};

const buildReviewPayload = async (prescription, tokenRecord) => {
  const patient = prescription.patient;
  const prescriber = await Prescriber.findByPk(prescription.prescriberId);

  return {
    prescription: {
      id: prescription.id,
      prescriptionNumber: prescription.prescriptionNumber,
      medicationDisplay: `Drug ${prescription.drugId}`,
      quantityValue: prescription.quantity,
      status: prescription.status,
      createdAt: prescription.created_at,
      patient: patient
        ? {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            patientNumber: `PT${String(patient.id).padStart(6, "0")}`,
          }
        : null,
      prescriber: prescriber
        ? {
            id: prescriber.id,
            name: prescriber.name,
            contact: prescriber.contact,
            email: prescriber.email || null,
            npi: prescriber.npi,
          }
        : null,
    },
    reviewState: tokenRecord
      ? {
          id: tokenRecord.id,
          expiresAt: tokenRecord.expiresAt,
          usedAt: tokenRecord.usedAt,
          decision: tokenRecord.decision,
          status: getReviewStatus(tokenRecord),
        }
      : null,
    tokenExpired: getReviewStatus(tokenRecord) === "expired",
  };
};

const loadTokenAndPrescription = async (token) => {
  const tokenRecord = await resolveReviewTokenRecord(token);
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

export const getPrescriptionReview = async (req, res) => {
  try {
    const { token } = req.params;
    const { tokenRecord, prescription } = await loadTokenAndPrescription(token);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Review link not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: await buildReviewPayload(prescription, tokenRecord),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load prescription review.",
    });
  }
};

const performReviewDecision = async (req, res, decision) => {
  try {
    const { token } = req.params;
    const { tokenRecord, prescription } = await loadTokenAndPrescription(token);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Review link not found.",
      });
    }

    if (prescription.status !== "new") {
      return res.status(409).json({
        success: false,
        message: "This prescription is no longer awaiting review.",
      });
    }

    if (tokenRecord.usedAt || tokenRecord.decision) {
      return res.status(409).json({
        success: false,
        message: "This review link has already been used.",
      });
    }

    if (getReviewStatus(tokenRecord) === "expired") {
      return res.status(410).json({
        success: false,
        message: "This review link has expired.",
      });
    }

    const nextStatus = REVIEW_DECISION_STATUS[decision];
    prescription.statusId = await getPrescriptionStatusId(nextStatus);
    prescription.status = nextStatus;
    await prescription.save();
    const consumedToken = await markReviewTokenUsed({
      tokenRecordId: tokenRecord.id,
      decision,
    });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: decision,
      summary: `Prescription ${prescription.prescriptionNumber} was ${decision}.`,
      metadata: {
        prescriptionId: prescription.id,
        decision,
        recipientEmail: consumedToken.recipientEmail,
        recipientName: consumedToken.recipientName,
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
      data: await buildReviewPayload(refreshedPrescription, consumedToken),
    });
  } catch (error) {
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

    const prescriber = await Prescriber.findByPk(prescription.prescriberId);
    const patientName = prescription.patient
      ? `${prescription.patient.firstName || ""} ${prescription.patient.lastName || ""}`.trim()
      : "N/A";

    const invite = await createPrescriptionReviewInvite({
      prescriptionId: prescription.id,
      prescriberName: prescriber?.name || "Prescriber",
      prescriberEmail: prescriber?.email || null,
      prescriptionSummary: {
        medicationDisplay: `Drug ${prescription.drugId}`,
        quantityValue: prescription.quantity,
        patientName,
      },
    });

    await writeAuditLog({
      entityType: "prescription",
      entityId: prescription.id,
      action: "sent_for_review",
      summary: `Sent prescription ${prescription.prescriptionNumber} for review.`,
      metadata: {
        reviewUrl: invite.reviewUrl,
        recipientName: invite.reviewRecord.recipientName,
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
