import React from "react";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import api from "../../services/api.js";
import "./PrescriptionsPage.css";
import "../dashboard/DashboardPage.css";

const STATUS_TABS = [
  "All",
  "New",
  "In Process",
  "Ready",
  "Picked Up",
  "Cancelled",
];

const INITIAL_FORM = {
  patient_id: "",
  prescriber_id: "",
  drug_name: "",
  status: "New",
  quantity: "",
  verified_by: "",
};

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "new") {
    return "New";
  }

  if (["in process", "in_process", "in-process"].includes(normalized)) {
    return "In Process";
  }

  if (normalized === "ready") {
    return "Ready";
  }

  if (["picked up", "picked_up", "picked-up"].includes(normalized)) {
    return "Picked Up";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "Cancelled";
  }

  return "New";
};

const formatReviewStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized || normalized === "not_sent") {
    return "Not Sent";
  }

  if (normalized === "pending") {
    return "Pending";
  }

  if (normalized === "approved") {
    return "Approved";
  }

  if (normalized === "rejected") {
    return "Rejected";
  }

  if (normalized === "expired") {
    return "Expired";
  }

  if (normalized === "completed") {
    return "Completed";
  }

  return "Not Sent";
};

const toPrescriptionEntry = (item) => {
  const patientName = item?.patient
    ? `${item.patient.firstName || ""} ${item.patient.lastName || ""}`.trim()
    : "Unknown Patient";

  const enteredBy = item?.fhirRaw?.entered_by || "-";
  const verifiedBy = item?.fhirRaw?.verified_by || "-";
  const pharmacyId = item?.fhirRaw?.pharmacy_id || "PHARMACY-DEMO";
  const prescriberId = item?.fhirRaw?.prescriber_id || "-";
  const drugArray = Array.isArray(item?.fhirRaw?.drug_name)
    ? item.fhirRaw.drug_name
    : String(item?.medicationDisplay || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  return {
    prescription_id: item?.id,
    prescription_number: item?.prescriptionNumber || "-",
    pharmacy_id: pharmacyId,
    patient_id: item?.patientId,
    patient_name: patientName,
    prescriber_id: prescriberId,
    drug_name: drugArray,
    status: normalizeStatus(item?.status),
    quantity: item?.quantityValue != null ? Number(item.quantityValue) : null,
    entered_by: enteredBy,
    verified_by: verifiedBy,
    created_at: item?.createdat || null,
    review_history: Array.isArray(item?.reviewHistory) ? item.reviewHistory : [],
    latest_review: item?.latestReview || null,
    review_summary: item?.reviewSummary || {
      hasBeenSent: false,
      totalSent: 0,
      latestStatus: "not_sent",
      latestDecision: null,
      latestSentAt: null,
      latestReviewedAt: null,
    },
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

const PrescriptionsPage = () => {
  const [statusTab, setStatusTab] = React.useState("All");
  const [selectedId, setSelectedId] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("details");
  const [prescriptions, setPrescriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [patients, setPatients] = React.useState([]);
  const [prescribers, setPrescribers] = React.useState([]);
  const [prescriberSearch, setPrescriberSearch] = React.useState("");
  const [prescribersLoading, setPrescribersLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(INITIAL_FORM);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [reviewLoading, setReviewLoading] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [saveSuccess, setSaveSuccess] = React.useState("");

  const fetchPrescriptions = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.listPrescriptions({ page: 1, limit: 200 });
      const mapped = (response?.data || []).map(toPrescriptionEntry);
      setPrescriptions(mapped);

      if (!selectedId && mapped[0]?.prescription_id) {
        setSelectedId(mapped[0].prescription_id);
      }
    } catch (err) {
      setError(err.message || "Failed to load prescriptions.");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchPatients = React.useCallback(async () => {
    try {
      const response = await api.searchPatients({ page: 1, limit: 200, q: "" });
      setPatients(response?.data || []);
    } catch {
      setPatients([]);
    }
  }, []);

  const fetchPrescribers = React.useCallback(async () => {
    setPrescribersLoading(true);

    try {
      const response = await api.listPrescribers({
        page: 1,
        limit: 200,
        q: "",
      });
      setPrescribers(response?.data || []);
    } catch {
      setPrescribers([]);
    } finally {
      setPrescribersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  React.useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  React.useEffect(() => {
    fetchPrescribers();
  }, [fetchPrescribers]);

  React.useEffect(() => {
    if (!formOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleCloseForm();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [formOpen]);

  const filtered = prescriptions.filter((item) => {
    const matchesStatus = statusTab === "All" || item.status === statusTab;
    const search = searchQuery.trim().toLowerCase();

    if (!search) {
      return matchesStatus;
    }

    const haystack = [
      item.prescription_number,
      item.patient_name,
      item.prescriber_id,
      item.pharmacy_id,
      item.entered_by,
      item.verified_by,
      item.status,
      ...(item.drug_name || []),
    ]
      .join(" ")
      .toLowerCase();

    return matchesStatus && haystack.includes(search);
  });
  const selected = prescriptions.find(
    (item) => item.prescription_id === selectedId,
  );

  React.useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      return;
    }

    const stillVisible = filtered.some(
      (item) => item.prescription_id === selectedId,
    );

    if (!stillVisible) {
      setSelectedId(filtered[0].prescription_id);
    }
  }, [filtered, selectedId]);

  const getStatusCount = React.useCallback(
    (status) =>
      status === "All"
        ? prescriptions.length
        : prescriptions.filter((item) => item.status === status).length,
    [prescriptions],
  );

  const filteredPrescribers = React.useMemo(() => {
    const search = prescriberSearch.trim().toLowerCase();
    if (!search) {
      return prescribers;
    }

    return prescribers.filter((prescriber) => {
      const name = String(prescriber?.name || "").toLowerCase();
      const email = String(prescriber?.email || "").toLowerCase();
      const npi = String(prescriber?.npi || "").toLowerCase();
      return (
        name.includes(search) || email.includes(search) || npi.includes(search)
      );
    });
  }, [prescriberSearch, prescribers]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleOpenForm = () => {
    setFormData(INITIAL_FORM);
    setPrescriberSearch("");
    setSaveError("");
    setSaveSuccess("");
    fetchPrescribers();
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSaveError("");
  };

  const handleCreatePrescription = async (event) => {
    event.preventDefault();
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const payload = {
        patient_id: formData.patient_id,
        prescriber_id: formData.prescriber_id || null,
        drug_name: formData.drug_name
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        status: formData.status,
        quantity: Number(formData.quantity),
        verified_by: formData.verified_by || null,
      };

      const response = await api.createPrescriptionEntry(payload);
      const created = response?.data;

      setSaveSuccess(response?.message || "Prescription added successfully.");

      if (created?.prescription_id) {
        setSelectedId(created.prescription_id);
      }

      await fetchPrescriptions();
      setFormOpen(false);
      setFormData(INITIAL_FORM);
    } catch (err) {
      setSaveError(err.message || "Failed to create prescription.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSendForReview = async (prescriptionId) => {
    setReviewLoading(prescriptionId);
    setSaveError("");
    setSaveSuccess("");

    try {
      const response = await api.sendPrescriptionForReview(prescriptionId);
      setSaveSuccess(response?.message || "Review email sent.");
      await fetchPrescriptions();
    } catch (err) {
      setSaveError(err.message || "Failed to send prescription for review.");
    } finally {
      setReviewLoading("");
    }
  };

  return (
    <AppShell title="Prescriptions">
      <div className="prescription-page">
        <div className="prescription-grid">
          <Card>
            <div className="prescription-toolbar">
              <div>
                <h3>Prescription Queue</h3>
                <p className="prescription-subtitle">
                  Manage prescriptions across workflow stages.
                </p>
              </div>
              <button
                className="prescription-primary-btn"
                onClick={handleOpenForm}
              >
                Add Prescription
              </button>
            </div>

            <div className="prescription-tabs">
              {STATUS_TABS.map((status) => (
                <button
                  key={status}
                  className={statusTab === status ? "active" : ""}
                  onClick={() => setStatusTab(status)}
                >
                  <span>{status}</span>
                  <em>{getStatusCount(status)}</em>
                </button>
              ))}
            </div>

            <form
              className="prescription-search"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by patient, drug, prescriber, Rx #, or status"
              />
            </form>

            {error ? (
              <div className="prescription-message error">{error}</div>
            ) : null}
            {saveSuccess ? (
              <div className="prescription-message success">{saveSuccess}</div>
            ) : null}

            {loading ? (
              <div className="prescription-message">
                Loading prescriptions...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No prescriptions"
                description="Use Add Prescription to create the first entry for this status."
              />
            ) : (
              <div className="prescription-list">
                {filtered.map((item) => (
                  <button
                    key={item.prescription_id}
                    className={`prescription-list-item ${
                      selectedId === item.prescription_id ? "active" : ""
                    }`}
                    onClick={() => setSelectedId(item.prescription_id)}
                  >
                    <strong>{item.patient_name}</strong>
                    <p>Patient record</p>
                    <div className="prescription-list-item-meta">
                      <span className="prescription-meta-pill">
                        Qty: {item.quantity ?? "N/A"}
                      </span>
                      <span
                        className={`prescription-review-pill ${String(
                          item.review_summary?.latestStatus || "not_sent",
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        Review:{" "}
                        {formatReviewStatus(item.review_summary?.latestStatus)}
                      </span>
                      <span
                        className={`prescription-status ${item.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="prescription-section-header">
              <h3>Prescription Details</h3>
              <div className="prescription-tabs">
                <button
                  className={activeTab === "details" ? "active" : ""}
                  onClick={() => setActiveTab("details")}
                >
                  Details
                </button>
                <button
                  className={activeTab === "audit" ? "active" : ""}
                  onClick={() => setActiveTab("audit")}
                >
                  Audit
                </button>
              </div>
            </div>

            {!selected ? (
              <EmptyState
                title="Select a prescription"
                description="Choose an item from the queue to inspect details."
              />
            ) : activeTab === "details" ? (
              <>
                <div className="prescription-detail-grid">
                  <div>
                    <span>Prescription Number</span>
                    <strong>{selected.prescription_number || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Patient</span>
                    <strong>{selected.patient_name}</strong>
                  </div>
                  <div>
                    <span>Pharmacy</span>
                    <strong>{selected.pharmacy_id || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Prescriber</span>
                    <strong>{selected.prescriber_id || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{selected.status}</strong>
                  </div>
                  <div>
                    <span>Drug Names</span>
                    <strong>{selected.drug_name.join(", ") || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Quantity</span>
                    <strong>{selected.quantity ?? "N/A"}</strong>
                  </div>
                  <div>
                    <span>Entered By</span>
                    <strong>{selected.entered_by || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Verified By</span>
                    <strong>{selected.verified_by || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Review Status</span>
                    <strong>
                      {formatReviewStatus(
                        selected.review_summary?.latestStatus,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Review Recipient</span>
                    <strong>
                      {selected.latest_review?.recipientName ||
                        selected.latest_review?.recipientEmail ||
                        "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span>Last Sent For Review</span>
                    <strong>
                      {formatDateTime(selected.review_summary?.latestSentAt)}
                    </strong>
                  </div>
                  <div>
                    <span>Last Reviewed At</span>
                    <strong>
                      {formatDateTime(selected.review_summary?.latestReviewedAt)}
                    </strong>
                  </div>
                  <div>
                    <span>Created At</span>
                    <strong>{formatDateTime(selected.created_at)}</strong>
                  </div>
                </div>
                <div className="prescription-review-history">
                  <div className="prescription-review-history-header">
                    <h4>Review History</h4>
                    <p>
                      {selected.review_history.length
                        ? `${selected.review_history.length} review request(s)`
                        : "No review requests have been sent yet."}
                    </p>
                  </div>
                  {selected.review_history.length ? (
                    <div className="prescription-review-history-list">
                      {selected.review_history.map((entry) => (
                        <div
                          key={entry.id}
                          className="prescription-review-history-item"
                        >
                          <div className="prescription-review-history-topline">
                            <strong>
                              {entry.recipientName ||
                                entry.recipientEmail ||
                                "Prescriber"}
                            </strong>
                            <span
                              className={`prescription-review-pill ${String(
                                entry.status || "not_sent",
                              )
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              {formatReviewStatus(entry.status)}
                            </span>
                          </div>
                          <p>{entry.recipientEmail || "No recipient email"}</p>
                          <div className="prescription-review-history-meta">
                            <span>
                              Sent: {formatDateTime(entry.sentAt)}
                            </span>
                            <span>
                              Reviewed: {formatDateTime(entry.usedAt)}
                            </span>
                            <span>
                              Expires: {formatDateTime(entry.expiresAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {selected.status === "New" ? (
                  <div className="prescription-details-actions">
                    <button
                      type="button"
                      className="prescription-secondary-btn"
                      onClick={() =>
                        handleSendForReview(selected.prescription_id)
                      }
                      disabled={reviewLoading === selected.prescription_id}
                    >
                      {reviewLoading === selected.prescription_id
                        ? "Sending..."
                        : "Send for review"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="prescription-detail-grid">
                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(selected.created_at)}</strong>
                </div>
                <div>
                  <span>Entered By</span>
                  <strong>{selected.entered_by || "N/A"}</strong>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {formOpen ? (
        <div className="prescription-modal-backdrop" onClick={handleCloseForm}>
          <div
            className="prescription-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="prescription-modal-header">
              <div>
                <h3>Add Prescription</h3>
                <p className="prescription-subtitle">
                  Create a new prescription entry for the workflow queue.
                </p>
              </div>
              <button
                className="prescription-modal-close"
                onClick={handleCloseForm}
              >
                Close
              </button>
            </div>

            {saveError ? (
              <div className="prescription-message error">{saveError}</div>
            ) : null}

            <form
              className="prescription-form"
              onSubmit={handleCreatePrescription}
            >
              <div className="prescription-form-grid">
                <label>
                  Patient
                  <select
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select patient</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName} (
                        {patient.patientNumber})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Prescriber
                  <input
                    value={prescriberSearch}
                    onChange={(event) =>
                      setPrescriberSearch(event.target.value)
                    }
                    placeholder="Search by name, email, or NPI"
                  />
                  <select
                    name="prescriber_id"
                    value={formData.prescriber_id}
                    onChange={handleFormChange}
                  >
                    <option value="">Select prescriber</option>
                    {filteredPrescribers.map((prescriber) => (
                      <option key={prescriber.id} value={prescriber.npi}>
                        {prescriber.name} ({prescriber.npi}) -{" "}
                        {prescriber.email}
                      </option>
                    ))}
                  </select>
                  <small>
                    {prescribersLoading
                      ? "Loading prescribers..."
                      : `${filteredPrescribers.length} prescriber option(s)`}
                  </small>
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    required
                  >
                    {STATUS_TABS.filter((status) => status !== "All").map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="prescription-form-span-2">
                  Drug Names (comma-separated)
                  <input
                    name="drug_name"
                    value={formData.drug_name}
                    onChange={handleFormChange}
                    placeholder="Amoxicillin 500 mg, Ibuprofen 200 mg"
                    required
                  />
                </label>
                <label>
                  Quantity
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={handleFormChange}
                    required
                  />
                </label>
                <label>
                  Verified By
                  <input
                    name="verified_by"
                    value={formData.verified_by}
                    onChange={handleFormChange}
                    placeholder="Future prescriber verification"
                  />
                </label>
              </div>

              <div className="prescription-modal-actions">
                <button
                  type="button"
                  className="prescription-secondary-btn"
                  onClick={handleCloseForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prescription-primary-btn"
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving..." : "Create Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default PrescriptionsPage;
