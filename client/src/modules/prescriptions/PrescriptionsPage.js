import React from "react";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import api from "../../services/api.js";
import "./PrescriptionsPage.css";
import "../dashboard/DashboardPage.css";

const STATUS_TABS = ["New", "In Process", "Ready", "Picked Up"];

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

  return "New";
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
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

const PrescriptionsPage = () => {
  const [statusTab, setStatusTab] = React.useState("New");
  const [selectedId, setSelectedId] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("details");
  const [prescriptions, setPrescriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [patients, setPatients] = React.useState([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(INITIAL_FORM);
  const [saveLoading, setSaveLoading] = React.useState(false);
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

  React.useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  React.useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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

  const filtered = prescriptions.filter((item) => item.status === statusTab);
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
    (status) => prescriptions.filter((item) => item.status === status).length,
    [prescriptions],
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleOpenForm = () => {
    setFormData(INITIAL_FORM);
    setSaveError("");
    setSaveSuccess("");
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
              <div className="prescription-detail-grid">
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
                  <span>Created At</span>
                  <strong>{formatDateTime(selected.created_at)}</strong>
                </div>
              </div>
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
                    name="prescriber_id"
                    value={formData.prescriber_id}
                    onChange={handleFormChange}
                    placeholder="Future integration"
                  />
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    required
                  >
                    {STATUS_TABS.map((status) => (
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
