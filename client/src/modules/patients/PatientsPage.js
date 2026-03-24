import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import "./PatientsPage.css";
import "../dashboard/DashboardPage.css";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phonePrimary: "",
  phoneSecondary: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  mrn: "",
  notes: "",
};

const GENDER_OPTIONS = [
  { label: "Select gender", value: "" },
  { label: "Female", value: "Female" },
  { label: "Male", value: "Male" },
  { label: "Non-binary", value: "Non-binary" },
  { label: "Other", value: "Other" },
  { label: "Prefer not to say", value: "Prefer not to say" },
];

const normalizeGenderValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) {
    return "";
  }

  if (normalized === "female") {
    return "Female";
  }

  if (normalized === "male") {
    return "Male";
  }

  if (["non-binary", "non binary", "nonbinary"].includes(normalized)) {
    return "Non-binary";
  }

  if (normalized === "other") {
    return "Other";
  }

  if (
    ["prefer not to say", "prefer-not-to-say", "decline"].includes(normalized)
  ) {
    return "Prefer not to say";
  }

  return "";
};

const STATE_OPTIONS = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const formatPhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const PatientFormFields = ({ formData, onChange }) => {
  return (
    <div className="patients-form-grid">
      <label>
        First Name
        <input
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={onChange}
          autoComplete="given-name"
          required
        />
      </label>
      <label>
        Last Name
        <input
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={onChange}
          autoComplete="family-name"
          required
        />
      </label>
      <label>
        Middle Name
        <input
          type="text"
          name="middleName"
          value={formData.middleName}
          onChange={onChange}
          autoComplete="additional-name"
        />
      </label>
      <label>
        Date of Birth
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={onChange}
          required
        />
      </label>
      <label>
        Gender
        <select
          name="gender"
          value={formData.gender}
          onChange={onChange}
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Email
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
        />
      </label>
      <label>
        Primary Phone
        <input
          type="tel"
          name="phonePrimary"
          value={formData.phonePrimary}
          onChange={onChange}
          autoComplete="tel"
          required
        />
      </label>
      <label>
        Secondary Phone
        <input
          type="tel"
          name="phoneSecondary"
          value={formData.phoneSecondary}
          onChange={onChange}
          autoComplete="tel-national"
        />
      </label>
      <label className="patients-form-span-2">
        Address Line 1
        <input
          type="text"
          name="addressLine1"
          value={formData.addressLine1}
          onChange={onChange}
          autoComplete="address-line1"
          required
        />
      </label>
      <label className="patients-form-span-2">
        Address Line 2
        <input
          type="text"
          name="addressLine2"
          value={formData.addressLine2}
          onChange={onChange}
          autoComplete="address-line2"
        />
      </label>
      <label>
        City
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={onChange}
          autoComplete="address-level2"
          required
        />
      </label>
      <label>
        State
        <select
          name="state"
          value={formData.state}
          onChange={onChange}
          autoComplete="address-level1"
          required
        >
          <option value="">Select state</option>
          {STATE_OPTIONS.map((stateCode) => (
            <option key={stateCode} value={stateCode}>
              {stateCode}
            </option>
          ))}
        </select>
      </label>
      <label>
        Zip Code
        <input
          type="text"
          name="zipCode"
          value={formData.zipCode}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[0-9]{5}(-[0-9]{4})?"
          required
        />
      </label>
      <label>
        MRN
        <input
          type="text"
          name="mrn"
          value={formData.mrn}
          onChange={onChange}
        />
      </label>
      <label className="patients-form-span-2">
        Notes
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onChange}
          rows="4"
        />
      </label>
    </div>
  );
};

const PatientsPage = () => {
  const { user } = useAuth();
  const canManagePatients = ["admin", "pharmacist"].includes(
    String(user?.role || "").toLowerCase(),
  );

  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [patients, setPatients] = React.useState([]);
  const [patientsLoading, setPatientsLoading] = React.useState(true);
  const [patientsError, setPatientsError] = React.useState("");
  const [patientsPagination, setPatientsPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [selectedPatientId, setSelectedPatientId] = React.useState("");
  const [selectedPatient, setSelectedPatient] = React.useState(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState("");

  const [formMode, setFormMode] = React.useState("create");
  const [formData, setFormData] = React.useState(EMPTY_FORM);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [saveSuccess, setSaveSuccess] = React.useState("");
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const applyPatientToForm = React.useCallback((patient) => {
    setFormData({
      firstName: patient?.firstName || "",
      lastName: patient?.lastName || "",
      middleName: patient?.middleName || "",
      dateOfBirth: patient?.dateOfBirth || "",
      gender: normalizeGenderValue(patient?.gender),
      email: patient?.email || "",
      phonePrimary: formatPhoneNumber(patient?.phonePrimary),
      phoneSecondary: formatPhoneNumber(patient?.phoneSecondary),
      addressLine1: patient?.addressLine1 || "",
      addressLine2: patient?.addressLine2 || "",
      city: patient?.city || "",
      state: patient?.state || "",
      zipCode: patient?.zipCode || "",
      mrn: patient?.mrn || "",
      notes: patient?.notes || "",
    });
  }, []);

  const fetchPatients = React.useCallback(async (page, q) => {
    setPatientsLoading(true);
    setPatientsError("");

    try {
      const response = await api.searchPatients({
        q,
        page,
        limit: 10,
      });

      const nextPatients = response?.data || [];
      setPatients(nextPatients);
      setPatientsPagination(
        response?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );

      if (!selectedPatientId && nextPatients[0]?.id) {
        setSelectedPatientId(nextPatients[0].id);
      }
    } catch (err) {
      setPatientsError(err.message || "Failed to load patients.");
    } finally {
      setPatientsLoading(false);
    }
  }, [selectedPatientId]);

  const fetchPatientDetails = React.useCallback(async (patientId) => {
    if (!patientId) {
      setSelectedPatient(null);
      setDetailsError("");
      return;
    }

    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response = await api.getPatient(patientId);
      const patient = response?.data || null;
      setSelectedPatient(patient);

      if (patient) {
        setFormMode("edit");
        applyPatientToForm(patient);
      }
    } catch (err) {
      setDetailsError(err.message || "Failed to load patient details.");
    } finally {
      setDetailsLoading(false);
    }
  }, [applyPatientToForm]);

  React.useEffect(() => {
    fetchPatients(patientsPagination.page, searchQuery);
  }, [fetchPatients, patientsPagination.page, searchQuery]);

  React.useEffect(() => {
    const normalizedQuery = searchInput.trim();

    if (normalizedQuery === searchQuery) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPatientsPagination((current) => ({ ...current, page: 1 }));
      setSearchQuery(normalizedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, searchQuery]);

  React.useEffect(() => {
    fetchPatientDetails(selectedPatientId);
  }, [fetchPatientDetails, selectedPatientId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextQuery = searchInput.trim();

    if (patientsPagination.page === 1 && nextQuery === searchQuery) {
      fetchPatients(1, nextQuery);
      return;
    }

    setPatientsPagination((current) => ({ ...current, page: 1 }));
    setSearchQuery(nextQuery);
  };

  const handleStartNewPatient = () => {
    setFormMode("create");
    setSaveError("");
    setSaveSuccess("");
    applyPatientToForm(EMPTY_FORM);
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setSaveError("");
    setFormMode("edit");

    if (selectedPatient) {
      applyPatientToForm(selectedPatient);
    } else {
      applyPatientToForm(EMPTY_FORM);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "phonePrimary" || name === "phoneSecondary"
        ? formatPhoneNumber(value)
        : value;

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
    }));
  };

  const handlePatientSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || null,
        middleName: formData.middleName || null,
        gender: formData.gender || null,
        email: formData.email || null,
        phoneSecondary: formData.phoneSecondary || null,
        addressLine2: formData.addressLine2 || null,
        mrn: formData.mrn || null,
        notes: formData.notes || null,
      };

      const response =
        formMode === "edit" && selectedPatientId
          ? await api.updatePatient(selectedPatientId, payload)
          : await api.createPatient(payload);

      const savedPatient = response?.data || null;
      const successMessage =
        response?.message ||
        (formMode === "edit"
          ? "Patient updated successfully."
          : "Patient created successfully.");

      setSaveSuccess(successMessage);

      if (savedPatient?.id) {
        setSelectedPatientId(savedPatient.id);
        setSelectedPatient(savedPatient);
        setFormMode("edit");
        applyPatientToForm(savedPatient);
        setCreateModalOpen(false);
      }

      fetchPatients(1, searchQuery);
      setPatientsPagination((current) => ({ ...current, page: 1 }));
    } catch (err) {
      setSaveError(err.message || "Failed to save patient.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!selectedPatientId || !selectedPatient) {
      return;
    }

    const confirmed = window.confirm(
      `Delete patient ${selectedPatient.firstName} ${selectedPatient.lastName}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteLoading(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const deletedId = selectedPatientId;
      await api.deletePatient(deletedId);

      setSaveSuccess("Patient deleted successfully.");
      setSelectedPatient(null);
      setSelectedPatientId("");
      setDetailsError("");
      applyPatientToForm(EMPTY_FORM);

      const nextPage =
        patients.length === 1 && patientsPagination.page > 1
          ? patientsPagination.page - 1
          : patientsPagination.page;

      await fetchPatients(nextPage, searchQuery);
      setPatientsPagination((current) => ({
        ...current,
        page: nextPage,
      }));
    } catch (err) {
      setSaveError(err.message || "Failed to delete patient.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppShell title="Patients">
      <div className="patients-page">
        <div className="patients-grid">
          <Card className="patients-panel patients-list-panel">
            <div className="patients-toolbar">
              <div>
                <h3>Patient Directory</h3>
                <p className="patients-subtitle">
                  Search patients by name, email, phone, patient number, or MRN.
                </p>
              </div>
              {canManagePatients ? (
                <button
                  type="button"
                  className="patients-primary-btn"
                  onClick={handleStartNewPatient}
                >
                  Add Patient
                </button>
              ) : null}
            </div>

            <form className="patients-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search patients"
              />
              <button type="submit">Search</button>
            </form>

            {patientsError ? (
              <div className="patients-message error">{patientsError}</div>
            ) : null}

            {patientsLoading ? (
              <div className="patients-message">Loading patients...</div>
            ) : patients.length === 0 ? (
              <EmptyState
                title="No patients found"
                description="Create a patient record or adjust the search term."
              />
            ) : (
              <>
                <div className="patients-list">
                  {patients.map((patient) => {
                    const isActive = selectedPatientId === patient.id;

                    return (
                      <button
                        key={patient.id}
                        type="button"
                        className={`patients-list-item${isActive ? " active" : ""}`}
                        onClick={() => setSelectedPatientId(patient.id)}
                      >
                        <div>
                          <strong>
                            {patient.firstName} {patient.lastName}
                          </strong>
                          <p>
                            {patient.patientNumber} | {patient.phonePrimary}
                          </p>
                        </div>
                        <span>{patient.email || "No email"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="patients-pagination">
                  <button
                    type="button"
                    onClick={() =>
                      setPatientsPagination((current) => ({
                        ...current,
                        page: Math.max(current.page - 1, 1),
                      }))
                    }
                    disabled={patientsPagination.page <= 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {patientsPagination.page} of{" "}
                    {Math.max(patientsPagination.totalPages || 1, 1)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPatientsPagination((current) => ({
                        ...current,
                        page: Math.min(
                          current.page + 1,
                          Math.max(current.totalPages || 1, 1),
                        ),
                      }))
                    }
                    disabled={
                      patientsPagination.page >=
                      Math.max(patientsPagination.totalPages || 1, 1)
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </Card>

          <div className="patients-sidepanels">
            <Card className="patients-panel">
              <div className="patients-section-header">
                <h3>Patient Details</h3>
                {selectedPatient ? (
                  <span className="patients-chip">
                    {selectedPatient.patientNumber}
                  </span>
                ) : null}
              </div>

              {detailsError ? (
                <div className="patients-message error">{detailsError}</div>
              ) : null}
              {saveError ? (
                <div className="patients-message error">{saveError}</div>
              ) : null}
              {saveSuccess ? (
                <div className="patients-message success">{saveSuccess}</div>
              ) : null}

              {detailsLoading ? (
                <div className="patients-message">Loading patient details...</div>
              ) : canManagePatients && selectedPatient ? (
                <form className="patients-form" onSubmit={handlePatientSave}>
                  <PatientFormFields
                    formData={formData}
                    onChange={handleFormChange}
                  />

                  <div className="patients-actions">
                    <button
                      type="button"
                      className="patients-danger-btn"
                      onClick={handleDeletePatient}
                      disabled={deleteLoading || saveLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Delete Patient"}
                    </button>
                    <button
                      type="submit"
                      className="patients-primary-btn"
                      disabled={saveLoading || deleteLoading}
                    >
                      {saveLoading
                        ? "Saving..."
                        : "Update Patient"}
                    </button>
                  </div>
                </form>
              ) : canManagePatients ? (
                <EmptyState
                  title="No patient selected"
                  description="Select a patient from the directory to edit details, or use Add Patient to create a new record."
                />
              ) : selectedPatient ? (
                <div className="patients-readonly">
                  <div className="patients-detail-grid">
                    <div>
                      <span>Name</span>
                      <strong>
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </strong>
                    </div>
                    <div>
                      <span>Patient Number</span>
                      <strong>{selectedPatient.patientNumber}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{selectedPatient.phonePrimary}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selectedPatient.email || "N/A"}</strong>
                    </div>
                    <div>
                      <span>DOB</span>
                      <strong>{selectedPatient.dateOfBirth || "N/A"}</strong>
                    </div>
                    <div>
                      <span>Address</span>
                      <strong>
                        {selectedPatient.addressLine1}, {selectedPatient.city},{" "}
                        {selectedPatient.state} {selectedPatient.zipCode}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Select a patient"
                  description="Choose a patient from the directory to review their details."
                />
              )}
            </Card>

          </div>
        </div>
      </div>

      {createModalOpen ? (
        <div
          className="patients-modal-backdrop"
          onClick={handleCloseCreateModal}
        >
          <div
            className="patients-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="patients-modal-header">
              <div>
                <h3>Add Patient</h3>
                <p className="patients-subtitle">
                  Create a new patient record and save it to the directory.
                </p>
              </div>
              <button
                type="button"
                className="patients-modal-close"
                onClick={handleCloseCreateModal}
              >
                Close
              </button>
            </div>

            {saveError ? (
              <div className="patients-message error">{saveError}</div>
            ) : null}

            <form className="patients-form" onSubmit={handlePatientSave}>
              <PatientFormFields
                formData={formData}
                onChange={handleFormChange}
              />

              <div className="patients-actions">
                <button
                  type="button"
                  className="patients-secondary-btn"
                  onClick={handleCloseCreateModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="patients-primary-btn"
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving..." : "Create Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default PatientsPage;
