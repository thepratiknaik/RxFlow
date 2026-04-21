import React, { useEffect, useState } from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import "./PrescriberPage.css";

const EMPTY_FORM = {
  name: "",
  contact: "",
  email: "",
  npi: "",
};

const PrescriberFormFields = ({ formData, onChange }) => (
  <div className="prescribers-form-grid">
    <label>
      Name
      <input type="text" name="name" value={formData.name} onChange={onChange} required />
    </label>

    <label>
      Contact
      <input
        type="text"
        name="contact"
        value={formData.contact}
        onChange={onChange}
        required
      />
    </label>

    <label>
      Email
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={onChange}
        required
      />
    </label>

    <label>
      NPI
      <input
        type="text"
        name="npi"
        value={formData.npi}
        onChange={onChange}
        maxLength={10}
        pattern="[0-9]{10}"
        title="NPI must be 10 digits"
        required
      />
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        <div className="prescribers-grid">
          <Card className="prescribers-panel">
            <div className="prescribers-toolbar">
              <div>
                <h3>Directory</h3>
                <p className="prescribers-subtitle">
                  Search by name, email, contact, or NPI number.
                </p>
              </div>
              {canManagePrescribers ? (
                <button className="prescribers-primary-btn" onClick={openCreateModal}>
                  Add Prescriber
                </button>
              ) : null}
            </div>

            <div className="prescribers-search">
              <input
                type="text"
                placeholder="Search prescribers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {error ? <div className="prescribers-message error">{error}</div> : null}
            {saveError ? <div className="prescribers-message error">{saveError}</div> : null}
            {successMessage ? (
              <div className="prescribers-message success">{successMessage}</div>
            ) : null}

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
                    className={`prescribers-list-item ${
                      selectedId === prescriber.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedId(prescriber.id)}
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

          <Card className="prescribers-panel prescribers-detail-panel">
            <div className="prescribers-section-header">
              <div>
                <p className="prescribers-eyebrow">Details</p>
                <h3>Prescriber profile</h3>
              </div>
              {selectedPrescriber ? (
                <span className="prescribers-chip">NPI: {selectedPrescriber.npi}</span>
              ) : null}
            </div>

            {!selectedPrescriber ? (
              <EmptyState
                title="Select a prescriber"
                description="Choose one from the directory to inspect contact details."
              />
            ) : (
              <>
                <div className="prescribers-spotlight">
                  <div>
                    <h4>{selectedPrescriber.name}</h4>
                    <p>{selectedPrescriber.email}</p>
                  </div>
                  <div className="prescribers-spotlight-badge">
                    <span>Contact</span>
                    <strong>{selectedPrescriber.contact}</strong>
                  </div>
                </div>

                <div className="prescribers-detail-grid">
                  <div>
                    <span>Name</span>
                    <strong>{selectedPrescriber.name}</strong>
                  </div>
                  <div>
                    <span>NPI</span>
                    <strong>{selectedPrescriber.npi}</strong>
                  </div>
                  <div>
                    <span>Contact</span>
                    <strong>{selectedPrescriber.contact}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{selectedPrescriber.email}</strong>
                  </div>
                </div>

                {canManagePrescribers ? (
                  <div className="prescribers-actions">
                    <button
                      type="button"
                      className="prescribers-secondary-btn"
                      onClick={openEditModal}
                    >
                      Edit Prescriber
                    </button>
                    <button
                      type="button"
                      className="prescribers-danger-btn"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Delete Prescriber"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>
      </div>

      {modalOpen ? (
        <div className="prescribers-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="prescribers-modal" onClick={(event) => event.stopPropagation()}>
            <div className="prescribers-modal-header">
              <div>
                <h3>{modalMode === "edit" ? "Edit Prescriber" : "Add Prescriber"}</h3>
                <p className="prescribers-subtitle">
                  Keep prescriber contact and NPI records ready for review routing.
                </p>
              </div>
              <button className="prescriber-modal-close" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            {saveError ? <div className="prescribers-message error">{saveError}</div> : null}

            <form onSubmit={handleSave} className="prescribers-form">
              <PrescriberFormFields formData={formData} onChange={handleChange} />

              <div className="prescribers-actions">
                <button
                  type="button"
                  className="prescribers-secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="prescribers-primary-btn"
                  disabled={saveLoading}
                >
                  {saveLoading
                    ? "Saving..."
                    : modalMode === "edit"
                      ? "Save Changes"
                      : "Create Prescriber"}
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
