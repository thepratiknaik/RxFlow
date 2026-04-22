import React from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api.js";
import "./PrescriberReviewPage.css";

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

const PrescriberReviewPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = React.useState(true);
  const [review, setReview] = React.useState(null);
  const [error, setError] = React.useState("");
  const [successMessage, setSuccessMessage] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState("");

  const loadReview = React.useCallback(async () => {
    if (!token) {
      setError("Missing review token.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await api.getPrescriptionReview(token);
      setReview(response?.data || null);
    } catch (err) {
      setReview(null);
      setError(err.message || "Unable to load this review link.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadReview();
  }, [loadReview]);

  const handleDecision = async (decision) => {
    setActionLoading(decision);
    setError("");
    setSuccessMessage("");

    try {
      const response =
        decision === "approved"
          ? await api.approvePrescriptionReview(token)
          : await api.rejectPrescriptionReview(token);

      setReview(response?.data || review);
      setSuccessMessage(response?.message || "Review updated.");
    } catch (err) {
      setError(err.message || "Unable to process this review.");
    } finally {
      setActionLoading("");
    }
  };

  const prescription = review?.prescription;
  const reviewState = review?.reviewState;
  const tokenExpired = Boolean(review?.tokenExpired);
  const hasBeenUsed = Boolean(reviewState?.usedAt);
  const canAct = Boolean(prescription) && !tokenExpired && !hasBeenUsed;

  return (
    <div className="prescription-review-page">
      <div className="prescription-review-shell">
        <div className="prescription-review-header">
          <div>
            <p className="prescription-review-eyebrow">One-time review</p>
            <h1>Prescription Approval</h1>
            <p className="prescription-review-subtitle">
              Review the prescription details and choose Approve or Reject.
            </p>
          </div>
          <div className="prescription-review-badge">
            {tokenExpired
              ? "Expired"
              : hasBeenUsed
                ? `Used: ${reviewState?.decision || "completed"}`
                : "Awaiting decision"}
          </div>
        </div>

        {loading ? (
          <div className="prescription-review-card">Loading review...</div>
        ) : error ? (
          <div className="prescription-review-card error">{error}</div>
        ) : !prescription ? (
          <div className="prescription-review-card">
            No prescription data available.
          </div>
        ) : (
          <div className="prescription-review-grid">
            <div className="prescription-review-card">
              <h2>Prescription</h2>
              <div className="prescription-review-details">
                <div>
                  <span>Medication</span>
                  <strong>{prescription.medicationDisplay}</strong>
                </div>
                <div>
                  <span>Quantity</span>
                  <strong>{prescription.quantityValue ?? "N/A"}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{prescription.status}</strong>
                </div>
                <div>
                  <span>Created At</span>
                  <strong>{formatDateTime(prescription.createdAt)}</strong>
                </div>
              </div>
            </div>

            <div className="prescription-review-card">
              <h2>Patient & Prescriber</h2>
              <div className="prescription-review-details">
                <div>
                  <span>Patient</span>
                  <strong>
                    {prescription.patient
                      ? `${prescription.patient.firstName || ""} ${prescription.patient.lastName || ""}`.trim()
                      : "N/A"}
                  </strong>
                </div>
                <div>
                  <span>Patient Number</span>
                  <strong>
                    {prescription.patient?.patientNumber || "N/A"}
                  </strong>
                </div>
                <div>
                  <span>Prescriber</span>
                  <strong>{prescription.prescriber?.name || "N/A"}</strong>
                </div>
                <div>
                  <span>Review Link</span>
                  <strong>{reviewState?.usedAt ? "Consumed" : "Active"}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {successMessage ? (
          <div className="prescription-review-card success">
            {successMessage}
          </div>
        ) : null}

        {!loading && prescription ? (
          <div className="prescription-review-actions">
            <button
              type="button"
              className="review-reject-btn"
              onClick={() => handleDecision("rejected")}
              disabled={!canAct || actionLoading}
            >
              {actionLoading === "rejected" ? "Rejecting..." : "Reject"}
            </button>
            <button
              type="button"
              className="review-approve-btn"
              onClick={() => handleDecision("approved")}
              disabled={!canAct || actionLoading}
            >
              {actionLoading === "approved" ? "Approving..." : "Approve"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PrescriberReviewPage;
