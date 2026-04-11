import React, { useState } from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "./PrescriberPage.css";

const MOCK_PRESCRIBERS = [
  {
    id: "1",
    first_name: "John",
    last_name: "Doe",
    npi_number: "1234567890",
    contact_details: "(123) 456-7890",
    created_at: "2026-04-01",
  },
  {
    id: "2",
    first_name: "Alice",
    last_name: "Smith",
    npi_number: "9876543210",
    contact_details: "alice@example.com",
    created_at: "2026-03-20",
  },
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  npi_number: "",
  contact_details: "",
};

const PrescriberFormFields = ({ formData, onChange }) => (
  <div className="prescribers-form-grid">
    <label>
      First Name
      <input
        type="text"
        name="first_name"
        value={formData.first_name}
        onChange={onChange}
        required
      />
    </label>

    <label>
      Last Name
      <input
        type="text"
        name="last_name"
        value={formData.last_name}
        onChange={onChange}
        required
      />
    </label>

    <label>
      NPI Number
      <input
        type="text"
        name="npi_number"
        value={formData.npi_number}
        onChange={onChange}
        required
      />
    </label>

    <label className="prescribers-form-span-2">
      Contact Details
      <input
        type="text"
        name="contact_details"
        value={formData.contact_details}
        onChange={onChange}
        placeholder="Phone / Email"
      />
    </label>
  </div>
);

const PrescribersPage = () => {
  const [prescribers, setPrescribers] = useState(MOCK_PRESCRIBERS);
  const [selectedId, setSelectedId] = useState(prescribers[0]?.id || "");
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedPrescriber = prescribers.find((p) => p.id === selectedId);

  const filtered = prescribers.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.npi_number}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = (e) => {
    e.preventDefault();

    const newPrescriber = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString().split("T")[0],
    };

    setPrescribers([newPrescriber, ...prescribers]);
    setModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  return (
    <AppShell title="Prescribers">
      <div className="prescribers-page">
        <div className="prescribers-grid">
          {/* LEFT PANEL */}
          <Card>
            <div className="prescribers-toolbar">
              <div>
                <h3>Prescriber Directory</h3>
                <p className="prescribers-subtitle">
                  Search prescribers by name or NPI number.
                </p>
              </div>
              <button
                className="prescribers-primary-btn"
                onClick={() => setModalOpen(true)}
              >
                Add Prescriber
              </button>
            </div>

            <div className="prescribers-search">
              <input
                type="text"
                placeholder="Search prescribers"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title="No prescribers found"
                description="Try adjusting your search."
              />
            ) : (
              <div className="prescribers-list">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className={`prescribers-list-item ${
                      selectedId === p.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedId(p.id)}
                  >
                    <strong>
                      {p.first_name} {p.last_name}
                    </strong>
                    <p>NPI: {p.npi_number}</p>
                    <span>{p.contact_details}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* RIGHT PANEL */}
          <Card>
            <div className="prescribers-section-header">
              <h3>Prescriber Details</h3>
              {selectedPrescriber && (
                <span className="prescribers-chip">
                  NPI: {selectedPrescriber.npi_number}
                </span>
              )}
            </div>

            {!selectedPrescriber ? (
              <EmptyState
                title="Select a prescriber"
                description="Choose one from the directory."
              />
            ) : (
              <div className="prescribers-detail-grid">
                <div>
                  <span>Name</span>
                  <strong>
                    {selectedPrescriber.first_name}{" "}
                    {selectedPrescriber.last_name}
                  </strong>
                </div>

                <div>
                  <span>NPI</span>
                  <strong>{selectedPrescriber.npi_number}</strong>
                </div>

                <div>
                  <span>Contact</span>
                  <strong>{selectedPrescriber.contact_details}</strong>
                </div>

                {/* <div>
                  <span>Created At</span>
                  <strong>{selectedPrescriber.created_at}</strong>
                </div> */}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div
          className="prescribers-modal-backdrop"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="prescribers-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="prescribers-modal-header">
              <h3>Add Prescriber</h3>
              <button className="prescriber-modal-close" onClick={() => setModalOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreate} className="prescribers-form">
              <PrescriberFormFields
                formData={formData}
                onChange={handleChange}
              />

              <div className="prescribers-actions">
                <button type="submit" className="prescribers-primary-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default PrescribersPage;