import React, { useEffect, useState } from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import { formatPhone, formatEmail } from "../../utils/formatters.js";
import "./PrescriberPage.css";

const EMPTY_FORM = {
  name: "",
  contact: "",
  email: "",
  npi: "",
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
};

const formatHistoryStatus = (value) => {
  switch (String(value || "").toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      return "Pending";
    case "expired":
      return "Expired";
    case "completed":
      return "Completed";
    case "not_sent":
      return "Not sent";
    default:
      return "Unknown";
  }
};

const PrescriberFormFields = ({ formData, onChange }) => (
  <div className="prescribers-form-fields">
    <label>
      Full Name
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={onChange}
        placeholder="Dr. Jane Smith"
        required
        autoComplete="name"
      />
    </label>

    <div className="prescribers-form-2col">
      <label>
        Contact Phone
        <input
          type="text"
          name="contact"
          value={formData.contact}
          onChange={onChange}
          placeholder="(xxx) xxx-xxxx"
          required
        />
      </label>
      <label>
        Email Address
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          placeholder="doctor@clinic.com"
          required
          autoComplete="email"
        />
      </label>
    </div>

    <label>
      NPI Number
      <input
        type="text"
        name="npi"
        value={formData.npi}
        onChange={onChange}
        maxLength={10}
        pattern="[0-9]{10}"
        title="NPI must be exactly 10 digits"
        placeholder="e.g. 1234567890"
        required
      />
      <small className="prescribers-form-hint">
        10-digit National Provider Identifier — used for review routing
      </small>
    </label>
  </div>
);

const PrescribersPage = () => {
  const { user } = useAuth();
  const canManagePrescribers = ["admin", "pharmacist"].includes(
    String(user?.role || "").toLowerCase(),
  );

  const [prescribers, setPrescribers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyData, setHistoryData] = useState({ counts: null, history: [] });
  const [resendLoading, setResendLoading] = useState(null);
  const [resendMessage, setResendMessage] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const loadPrescribers = React.useCallback(async (query = "") => {
    setLoading(true);
    setError("");

    try {
      const response = await api.listPrescribers({
        page: 1,
        limit: 200,
        q: query,
      });
      const rows = response?.data || [];
      setPrescribers(rows);

      setSelectedId((currentSelectedId) => {
        if (!rows.length) {
          return "";
        }

        return rows.some((row) => row.id === currentSelectedId)
          ? currentSelectedId
          : rows[0].id;
      });
    } catch (err) {
      setPrescribers([]);
      setError(err.message || "Failed to load prescribers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      loadPrescribers(search);
    }, 250);

    return () => window.clearTimeout(debounceId);
  }, [loadPrescribers, search]);

  const selectedPrescriber = prescribers.find((p) => p.id === selectedId) || null;

  useEffect(() => {
    setActiveTab("profile");
    setHistoryError("");
    setHistoryData({ counts: null, history: [] });
  }, [selectedId]);

  useEffect(() => {
    if (activeTab !== "history" || !selectedPrescriber?.id) {
      return undefined;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await api.getPrescriberHistory(selectedPrescriber.id);
        if (!cancelled) {
          setHistoryData({
            counts: response?.data?.counts || null,
            history: response?.data?.history || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setHistoryError(err.message || "Failed to load prescriber history.");
          setHistoryData({ counts: null, history: [] });
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedPrescriber?.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    let formatted = value;
    if (name === "contact") {
      formatted = formatPhone(value.replace(/\D/g, "").slice(0, 10));
    } else if (name === "email") {
      formatted = formatEmail(value);
    }
    setFormData((prev) => ({ ...prev, [name]: formatted }));
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormData(EMPTY_FORM);
    setSaveError("");
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedPrescriber) {
      return;
    }

    setModalMode("edit");
    setFormData({
      name: selectedPrescriber.name || "",
      contact: selectedPrescriber.contact || "",
      email: selectedPrescriber.email || "",
      npi: selectedPrescriber.npi || "",
    });
    setSaveError("");
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaveError("");
    setSuccessMessage("");
    setSaveLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        npi: formData.npi.trim(),
      };

      const response =
        modalMode === "edit" && selectedPrescriber
          ? await api.updatePrescriber(selectedPrescriber.id, payload)
          : await api.createPrescriber(payload);

      const saved = response?.data;
      if (saved?.id) {
        setSelectedId(saved.id);
      }

      await loadPrescribers(search);
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      setSuccessMessage(
        response?.message ||
          (modalMode === "edit" ? "Prescriber updated." : "Prescriber created."),
      );
    } catch (err) {
      setSaveError(err.message || "Failed to save prescriber.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleResend = async (prescriptionId) => {
    setResendLoading(prescriptionId);
    setResendMessage("");
    try {
      const response = await api.sendPrescriptionForReview(prescriptionId);
      setResendMessage(response?.message || "Review email resent.");
    } catch (err) {
      setResendMessage(err.message || "Failed to resend review email.");
    } finally {
      setResendLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedPrescriber) {
      return;
    }

    const confirmed = window.confirm(
      `Delete prescriber ${selectedPrescriber.name}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoading(true);
    setSuccessMessage("");
    setSaveError("");

    try {
      await api.deletePrescriber(selectedPrescriber.id);
      setSuccessMessage("Prescriber deleted.");
      setSelectedId("");
      setViewModalOpen(false);
      await loadPrescribers(search);
    } catch (err) {
      setSaveError(err.message || "Failed to delete prescriber.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppShell title="Prescribers">
      <div className="prescribers-page">
        <div className="pg-head">
          {canManagePrescribers ? (
            <button className="prescribers-primary-btn" onClick={openCreateModal}>
              + Add Prescriber
            </button>
          ) : null}
        </div>

        <Card>
          <input
            type="text"
            className="prescribers-search-input"
            placeholder="Search prescribers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {error ? <div className="prescribers-message error">{error}</div> : null}
          {saveError ? <div className="prescribers-message error">{saveError}</div> : null}
          {successMessage ? <div className="prescribers-message success">{successMessage}</div> : null}

          {loading ? (
            <div className="prescribers-message">Loading prescribers...</div>
          ) : prescribers.length === 0 ? (
            <EmptyState
              title="No prescribers found"
              description="Try adjusting your search or add a new prescriber."
            />
          ) : (
            <div className="prescribers-list">
              {prescribers.map((prescriber) => (
                <button
                  key={prescriber.id}
                  className={`prescribers-list-item ${selectedId === prescriber.id ? "active" : ""}`}
                  onClick={() => { setSelectedId(prescriber.id); setActiveTab("profile"); setViewModalOpen(true); }}
                >
                  <div>
                    <strong>{prescriber.name}</strong>
                    <p>{prescriber.email}</p>
                  </div>
                  <span>NPI {prescriber.npi}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── View Prescriber modal ── */}
      {viewModalOpen && selectedPrescriber ? (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedPrescriber.name}</h3>
                <p>NPI {selectedPrescriber.npi}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setViewModalOpen(false)}>×</button>
            </div>

            <div className="modal-tabs">
              <button type="button" className={`modal-tab${activeTab === "profile" ? " active" : ""}`} onClick={() => setActiveTab("profile")}>Profile</button>
              <button type="button" className={`modal-tab${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>Prescription History</button>
            </div>

            {activeTab === "profile" ? (
              <>
                <div className="prescribers-spotlight">
                  <div>
                    <h4>{selectedPrescriber.name}</h4>
                    <p>{selectedPrescriber.email}</p>
                  </div>
                  <div className="prescribers-spotlight-badge">
                    <span>Contact</span>
                    <strong>{formatPhone(selectedPrescriber.contact)}</strong>
                  </div>
                </div>

                <div className="detail-grid">
                  <div><span>Name</span><strong>{selectedPrescriber.name}</strong></div>
                  <div><span>NPI</span><strong>{selectedPrescriber.npi}</strong></div>
                  <div><span>Contact</span><strong>{formatPhone(selectedPrescriber.contact)}</strong></div>
                  <div><span>Email</span><strong>{selectedPrescriber.email}</strong></div>
                </div>

                {canManagePrescribers ? (
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="prescribers-danger-btn"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Delete Prescriber"}
                    </button>
                    <button
                      type="button"
                      className="prescribers-secondary-btn"
                      onClick={openEditModal}
                    >
                      Edit Prescriber
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="prescribers-history-panel">
                <div className="prescribers-history-summary">
                  <div><span>Approved</span><strong>{historyData.counts?.approved || 0}</strong></div>
                  <div><span>Rejected</span><strong>{historyData.counts?.rejected || 0}</strong></div>
                  <div><span>Pending</span><strong>{historyData.counts?.pending || 0}</strong></div>
                  <div><span>Expired</span><strong>{historyData.counts?.expired || 0}</strong></div>
                </div>

                {resendMessage ? <div className="prescribers-message">{resendMessage}</div> : null}
                {historyError ? <div className="prescribers-message error">{historyError}</div> : null}

                {historyLoading ? (
                  <div className="prescribers-message">Loading prescription history...</div>
                ) : historyData.history.length === 0 ? (
                  <EmptyState
                    title="No prescription history"
                    description="This prescriber does not have any linked review activity yet."
                  />
                ) : (
                  <div className="prescribers-history-list">
                    {historyData.history.map((item) => {
                      const patientName = item?.patient
                        ? `${item.patient.firstName || ""} ${item.patient.lastName || ""}`.trim()
                        : "Unknown patient";
                      const reviewStatus = item?.reviewSummary?.latestStatus || "not_sent";
                      const latestReview = item?.latestReview || null;

                      return (
                        <article key={item.id} className="prescribers-history-item">
                          <div className="prescribers-history-item-header">
                            <div>
                              <strong>{item.medicationDisplay || "Medication"}</strong>
                              <p>{patientName} | RX {item.prescriptionNumber}</p>
                            </div>
                            <span className={`badge badge-${reviewStatus.replace(/_/g, "-")}`}>
                              {formatHistoryStatus(reviewStatus)}
                            </span>
                          </div>

                          <div className="prescribers-history-meta">
                            <span>Prescription status: {item.status || "-"}</span>
                            <span>Verified by: {item?.fhirRaw?.verified_by || "-"}</span>
                            <span>Sent: {formatDateTime(item?.reviewSummary?.latestSentAt)}</span>
                            <span>Reviewed: {formatDateTime(item?.reviewSummary?.latestReviewedAt)}</span>
                          </div>

                          {latestReview ? (
                            <div className="prescribers-history-note">
                              Review recipient:{" "}
                              {latestReview.recipientName || latestReview.recipientEmail || selectedPrescriber.email}
                            </div>
                          ) : null}

                          {reviewStatus === "pending" && canManagePrescribers ? (
                            <div className="prescribers-history-actions">
                              <button
                                type="button"
                                className="prescribers-secondary-btn"
                                onClick={() => handleResend(item.id)}
                                disabled={resendLoading === item.id}
                              >
                                {resendLoading === item.id ? "Resending..." : "Resend for review"}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Add / Edit Prescriber modal ── */}
      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div className="prescribers-modal-title-group">
                <div className="prescribers-modal-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3>{modalMode === "edit" ? "Edit Prescriber" : "Add Prescriber"}</h3>
                  <p>NPI and contact details are used for prescription review routing.</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>

            {saveError ? <div className="prescribers-message error">{saveError}</div> : null}

            <form onSubmit={handleSave} className="prescribers-form">
              <PrescriberFormFields formData={formData} onChange={handleChange} />
              <div className="modal-footer">
                <button type="button" className="prescribers-secondary-btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="prescribers-primary-btn" disabled={saveLoading}>
                  {saveLoading ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Prescriber"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default PrescribersPage;
