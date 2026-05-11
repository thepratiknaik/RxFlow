import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import { formatPhone, formatZip, formatAddress, formatCityStateZip } from "../../utils/formatters.js";
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
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

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
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];


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
        <select name="gender" value={formData.gender} onChange={onChange}>
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

const InsuranceSection = ({
  selectedPatient,
  canManagePatients,
  insuranceList,
  insuranceLoading,
  insuranceError,
  insuranceForm,
  insuranceSaving,
  insuranceMessage,
  insuranceEditingId,
  insuranceEditForm,
  insuranceActionId,
  onInsuranceFormChange,
  onInsuranceSave,
  onInsuranceEditStart,
  onInsuranceEditCancel,
  onInsuranceEditFormChange,
  onInsuranceEditSave,
  onInsuranceDelete,
}) => {
  return (
    <div className="patients-form">
      {insuranceError ? (
        <div className="patients-message error">{insuranceError}</div>
      ) : null}

      {insuranceMessage ? (
        <div className="patients-message success">{insuranceMessage}</div>
      ) : null}

      {insuranceLoading ? (
        <div className="patients-message">Loading insurance records...</div>
      ) : insuranceList.length === 0 ? (
        <EmptyState
          title="No insurance records"
          description="Add insurance details for this patient."
        />
      ) : (
        <div className="patients-insurance-list">
          {insuranceList.map((insurance) => (
            <div
              key={insurance.insurance_id}
              className="patients-insurance-item"
            >
              {insuranceEditingId === insurance.insurance_id ? (
                <>
                  <label>
                    Provider
                    <input
                      type="text"
                      name="provider_name"
                      value={insuranceEditForm.provider_name}
                      onChange={onInsuranceEditFormChange}
                    />
                  </label>
                  <label>
                    Member ID
                    <input
                      type="text"
                      name="member_id"
                      value={insuranceEditForm.member_id}
                      onChange={onInsuranceEditFormChange}
                    />
                  </label>
                  <label>
                    BIN Number
                    <input
                      type="text"
                      name="bin_number"
                      value={insuranceEditForm.bin_number}
                      onChange={onInsuranceEditFormChange}
                    />
                  </label>
                  <label>
                    PCN Number
                    <input
                      type="text"
                      name="pcn_number"
                      value={insuranceEditForm.pcn_number}
                      onChange={onInsuranceEditFormChange}
                    />
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <span>Provider</span>
                    <strong>{insurance.provider_name}</strong>
                  </div>
                  <div>
                    <span>Member ID</span>
                    <strong>{insurance.member_id}</strong>
                  </div>
                  <div>
                    <span>BIN Number</span>
                    <strong>{insurance.bin_number || "N/A"}</strong>
                  </div>
                  <div>
                    <span>PCN Number</span>
                    <strong>{insurance.pcn_number || "N/A"}</strong>
                  </div>
                </>
              )}

              {canManagePatients ? (
                <div className="patients-insurance-actions">
                  {insuranceEditingId === insurance.insurance_id ? (
                    <>
                      <button
                        type="button"
                        className="patients-primary-btn"
                        disabled={insuranceActionId === insurance.insurance_id}
                        onClick={() =>
                          onInsuranceEditSave(insurance.insurance_id)
                        }
                      >
                        {insuranceActionId === insurance.insurance_id
                          ? "Saving..."
                          : "Save"}
                      </button>
                      <button
                        type="button"
                        className="patients-secondary-btn"
                        disabled={insuranceActionId === insurance.insurance_id}
                        onClick={onInsuranceEditCancel}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="patients-secondary-btn"
                        disabled={insuranceActionId === insurance.insurance_id}
                        onClick={() => onInsuranceEditStart(insurance)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="patients-danger-btn"
                        disabled={insuranceActionId === insurance.insurance_id}
                        onClick={() =>
                          onInsuranceDelete(insurance.insurance_id)
                        }
                      >
                        {insuranceActionId === insurance.insurance_id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canManagePatients ? (
        <form className="patients-insurance-form" onSubmit={onInsuranceSave}>
          <h4>Add Insurance</h4>
          <div className="patients-form-grid">
            <label>
              Provider Name
              <input
                type="text"
                name="provider_name"
                value={insuranceForm.provider_name}
                onChange={onInsuranceFormChange}
                required
              />
            </label>
            <label>
              Member ID
              <input
                type="text"
                name="member_id"
                value={insuranceForm.member_id}
                onChange={onInsuranceFormChange}
                required
              />
            </label>
            <label>
              BIN Number
              <input
                type="text"
                name="bin_number"
                value={insuranceForm.bin_number}
                onChange={onInsuranceFormChange}
              />
            </label>
            <label>
              PCN Number
              <input
                type="text"
                name="pcn_number"
                value={insuranceForm.pcn_number}
                onChange={onInsuranceFormChange}
              />
            </label>
          </div>

          <div className="patients-actions">
            <button
              type="submit"
              className="patients-primary-btn"
              disabled={insuranceSaving || !selectedPatient?.id}
            >
              {insuranceSaving ? "Saving..." : "Add Insurance"}
            </button>
          </div>
        </form>
      ) : null}
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
  const [viewModalOpen, setViewModalOpen] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState("details");
  const [orders, setOrders] = React.useState([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersError, setOrdersError] = React.useState("");
  const [insuranceList, setInsuranceList] = React.useState([]);
  const [insuranceLoading, setInsuranceLoading] = React.useState(false);
  const [insuranceError, setInsuranceError] = React.useState("");
  const [insuranceSaving, setInsuranceSaving] = React.useState(false);
  const [insuranceMessage, setInsuranceMessage] = React.useState("");
  const [insuranceEditingId, setInsuranceEditingId] = React.useState("");
  const [insuranceActionId, setInsuranceActionId] = React.useState("");
  const [insuranceEditForm, setInsuranceEditForm] = React.useState({
    provider_name: "",
    member_id: "",
    bin_number: "",
    pcn_number: "",
  });
  const [insuranceForm, setInsuranceForm] = React.useState({
    provider_name: "",
    member_id: "",
    bin_number: "",
    pcn_number: "",
  });

  const applyPatientToForm = React.useCallback((patient) => {
    setFormData({
      firstName: patient?.firstName || "",
      lastName: patient?.lastName || "",
      middleName: patient?.middleName || "",
      dateOfBirth: patient?.dateOfBirth || "",
      gender: normalizeGenderValue(patient?.gender),
      email: patient?.email || "",
      phonePrimary: formatPhone(patient?.phonePrimary),
      phoneSecondary: formatPhone(patient?.phoneSecondary),
      addressLine1: patient?.addressLine1 || "",
      addressLine2: patient?.addressLine2 || "",
      city: patient?.city || "",
      state: patient?.state || "",
      zipCode: patient?.zipCode || "",
      mrn: patient?.mrn || "",
      notes: patient?.notes || "",
    });
  }, []);

  const fetchPatients = React.useCallback(
    async (page, q) => {
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
    },
    [selectedPatientId],
  );

  const fetchPatientDetails = React.useCallback(
    async (patientId) => {
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
    },
    [applyPatientToForm],
  );

  const fetchPatientInsurances = React.useCallback(async (patientId) => {
    if (!patientId) {
      setInsuranceList([]);
      setInsuranceError("");
      return;
    }

    setInsuranceLoading(true);
    setInsuranceError("");

    try {
      const response = await api.listPatientInsurances(patientId);
      setInsuranceList(response?.data || []);
      setInsuranceEditingId("");
    } catch (err) {
      setInsuranceError(err.message || "Failed to load patient insurances.");
      setInsuranceList([]);
    } finally {
      setInsuranceLoading(false);
    }
  }, []);

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

  React.useEffect(() => {
    if (activeTab === "insurance") {
      fetchPatientInsurances(selectedPatientId);
    }
  }, [activeTab, fetchPatientInsurances, selectedPatientId]);

  React.useEffect(() => {
    if (activeTab !== "orders" || !selectedPatientId) {
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersError("");
    api
      .listPatientPrescriptions(selectedPatientId)
      .then((res) => {
        if (!cancelled) setOrders(res?.data || []);
      })
      .catch((err) => {
        if (!cancelled) setOrdersError(err.message || "Failed to load orders.");
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedPatientId]);

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
    let nextValue = value;
    if (name === "phonePrimary" || name === "phoneSecondary") {
      nextValue = formatPhone(value);
    } else if (name === "zipCode") {
      nextValue = formatZip(value);
    } else if (name === "email") {
      nextValue = value.toLowerCase();
    }
    setFormData((current) => ({ ...current, [name]: nextValue }));
  };

  const handleInsuranceFormChange = (e) => {
    const { name, value } = e.target;

    setInsuranceForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleInsuranceSave = async (e) => {
    e.preventDefault();

    if (!selectedPatientId) {
      return;
    }

    setInsuranceSaving(true);
    setInsuranceError("");
    setInsuranceMessage("");

    try {
      await api.addPatientInsurance(selectedPatientId, {
        provider_name: insuranceForm.provider_name,
        member_id: insuranceForm.member_id,
        bin_number: insuranceForm.bin_number || null,
        pcn_number: insuranceForm.pcn_number || null,
      });

      setInsuranceForm({
        provider_name: "",
        member_id: "",
        bin_number: "",
        pcn_number: "",
      });
      setInsuranceMessage("Insurance added successfully.");
      await fetchPatientInsurances(selectedPatientId);
    } catch (err) {
      setInsuranceError(err.message || "Failed to add insurance.");
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleInsuranceEditStart = (insurance) => {
    setInsuranceEditingId(insurance.insurance_id);
    setInsuranceEditForm({
      provider_name: insurance.provider_name || "",
      member_id: insurance.member_id || "",
      bin_number: insurance.bin_number || "",
      pcn_number: insurance.pcn_number || "",
    });
    setInsuranceError("");
    setInsuranceMessage("");
  };

  const handleInsuranceEditCancel = () => {
    setInsuranceEditingId("");
    setInsuranceEditForm({
      provider_name: "",
      member_id: "",
      bin_number: "",
      pcn_number: "",
    });
  };

  const handleInsuranceEditFormChange = (e) => {
    const { name, value } = e.target;
    setInsuranceEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleInsuranceEditSave = async (insuranceId) => {
    if (!selectedPatientId || !insuranceId) {
      return;
    }

    setInsuranceActionId(insuranceId);
    setInsuranceError("");
    setInsuranceMessage("");

    try {
      await api.updatePatientInsurance(selectedPatientId, insuranceId, {
        provider_name: insuranceEditForm.provider_name,
        member_id: insuranceEditForm.member_id,
        bin_number: insuranceEditForm.bin_number || null,
        pcn_number: insuranceEditForm.pcn_number || null,
      });

      setInsuranceMessage("Insurance updated successfully.");
      await fetchPatientInsurances(selectedPatientId);
      handleInsuranceEditCancel();
    } catch (err) {
      setInsuranceError(err.message || "Failed to update insurance.");
    } finally {
      setInsuranceActionId("");
    }
  };

  const handleInsuranceDelete = async (insuranceId) => {
    if (!selectedPatientId || !insuranceId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this insurance record? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setInsuranceActionId(insuranceId);
    setInsuranceError("");
    setInsuranceMessage("");

    try {
      await api.deletePatientInsurance(selectedPatientId, insuranceId);
      setInsuranceMessage("Insurance deleted successfully.");
      await fetchPatientInsurances(selectedPatientId);

      if (insuranceEditingId === insuranceId) {
        handleInsuranceEditCancel();
      }
    } catch (err) {
      setInsuranceError(err.message || "Failed to delete insurance.");
    } finally {
      setInsuranceActionId("");
    }
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
      setViewModalOpen(false);
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
        <div className="pg-head">
          {canManagePatients ? (
            <button
              type="button"
              className="patients-primary-btn"
              onClick={handleStartNewPatient}
            >
              + Add Patient
            </button>
          ) : null}
        </div>

        <Card>
          <form className="patients-search" onSubmit={(e) => e.preventDefault()} style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search patients"
              style={{ width: "100%" }}
            />
          </form>
          {patientsError ? (
            <div className="patients-message error">{patientsError}</div>
          ) : null}
          {saveSuccess ? (
            <div className="patients-message success">{saveSuccess}</div>
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
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className={`patients-list-item${selectedPatientId === patient.id ? " active" : ""}`}
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      setActiveTab("details");
                      setSaveError("");
                      setSaveSuccess("");
                      setViewModalOpen(true);
                    }}
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
                ))}
              </div>

              <div className="patients-pagination">
                <button
                  type="button"
                  onClick={() =>
                    setPatientsPagination((c) => ({
                      ...c,
                      page: Math.max(c.page - 1, 1),
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
                    setPatientsPagination((c) => ({
                      ...c,
                      page: Math.min(
                        c.page + 1,
                        Math.max(c.totalPages || 1, 1),
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
      </div>

      {/* ── View Patient modal ── */}
      {viewModalOpen ? (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  {selectedPatient
                    ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                    : "Patient Details"}
                </h3>
                {selectedPatient ? (
                  <p>{selectedPatient.patientNumber}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-tabs">
              <button type="button" className={`modal-tab${activeTab === "details" ? " active" : ""}`} onClick={() => setActiveTab("details")}>Details</button>
              <button type="button" className={`modal-tab${activeTab === "insurance" ? " active" : ""}`} onClick={() => setActiveTab("insurance")}>Insurance</button>
              <button type="button" className={`modal-tab${activeTab === "orders" ? " active" : ""}`} onClick={() => setActiveTab("orders")}>Orders</button>
            </div>

            {detailsLoading ? (
              <div className="patients-message">Loading patient details...</div>
            ) : !selectedPatient ? (
              <EmptyState
                title="No patient data"
                description="Could not load patient details."
              />
            ) : activeTab === "details" ? (
              <>
                {detailsError ? (
                  <div className="patients-message error">{detailsError}</div>
                ) : null}
                {saveError ? (
                  <div className="patients-message error">{saveError}</div>
                ) : null}

                {canManagePatients ? (
                  <form className="patients-form" onSubmit={handlePatientSave}>
                    <PatientFormFields
                      formData={formData}
                      onChange={handleFormChange}
                    />
                    <div className="modal-footer">
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
                        {saveLoading ? "Saving..." : "Update Patient"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="patients-readonly">
                    <div className="detail-grid">
                      <div>
                        <span>Full Name</span>
                        <strong>
                          {[selectedPatient.firstName, selectedPatient.middleName, selectedPatient.lastName].filter(Boolean).join(" ")}
                        </strong>
                      </div>
                      <div>
                        <span>Patient Number</span>
                        <strong>{selectedPatient.patientNumber || "—"}</strong>
                      </div>
                      <div>
                        <span>Date of Birth</span>
                        <strong>{selectedPatient.dateOfBirth || "—"}</strong>
                      </div>
                      <div>
                        <span>Gender</span>
                        <strong>{selectedPatient.gender || "—"}</strong>
                      </div>
                      <div>
                        <span>Primary Phone</span>
                        <strong>{formatPhone(selectedPatient.phonePrimary) || "—"}</strong>
                      </div>
                      <div>
                        <span>Secondary Phone</span>
                        <strong>{formatPhone(selectedPatient.phoneSecondary) || "—"}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{selectedPatient.email || "—"}</strong>
                      </div>
                      <div>
                        <span>MRN</span>
                        <strong>{selectedPatient.mrn || "—"}</strong>
                      </div>
                      {selectedPatient.addressLine1 && (
                        <div className="detail-grid-span2">
                          <span>Address</span>
                          <strong>
                            {formatAddress(
                              selectedPatient.addressLine1,
                              selectedPatient.addressLine2,
                              selectedPatient.city,
                              selectedPatient.state,
                              selectedPatient.zipCode,
                            )}
                          </strong>
                        </div>
                      )}
                      {!selectedPatient.addressLine1 && (
                        <>
                          <div>
                            <span>City / State</span>
                            <strong>{formatCityStateZip(selectedPatient.city, selectedPatient.state, "")}</strong>
                          </div>
                          <div>
                            <span>Zip Code</span>
                            <strong>{formatZip(selectedPatient.zipCode) || "—"}</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : activeTab === "insurance" ? (
              <InsuranceSection
                selectedPatient={selectedPatient}
                canManagePatients={canManagePatients}
                insuranceList={insuranceList}
                insuranceLoading={insuranceLoading}
                insuranceError={insuranceError}
                insuranceForm={insuranceForm}
                insuranceSaving={insuranceSaving}
                insuranceMessage={insuranceMessage}
                insuranceEditingId={insuranceEditingId}
                insuranceEditForm={insuranceEditForm}
                insuranceActionId={insuranceActionId}
                onInsuranceFormChange={handleInsuranceFormChange}
                onInsuranceSave={handleInsuranceSave}
                onInsuranceEditStart={handleInsuranceEditStart}
                onInsuranceEditCancel={handleInsuranceEditCancel}
                onInsuranceEditFormChange={handleInsuranceEditFormChange}
                onInsuranceEditSave={handleInsuranceEditSave}
                onInsuranceDelete={handleInsuranceDelete}
              />
            ) : (
              <div className="patients-orders-panel">
                {ordersError ? (
                  <div className="patients-message error">{ordersError}</div>
                ) : null}
                {ordersLoading ? (
                  <div className="patients-message">Loading orders...</div>
                ) : orders.length === 0 ? (
                  <EmptyState
                    title="No prescriptions"
                    description="This patient has no prescription history yet."
                  />
                ) : (
                  <div className="patients-orders-list">
                    {orders.map((rx) => {
                      const drug = Array.isArray(rx.fhirRaw?.drug_name)
                        ? rx.fhirRaw.drug_name[0]
                        : rx.medicationDisplay || "Drug";
                      const status = String(rx.status || "").replace(/_/g, " ");
                      return (
                        <div key={rx.id} className="patients-order-item">
                          <div className="patients-order-header">
                            <strong>{drug}</strong>
                            <span
                              className={`patients-order-pill status-${String(rx.status || "").toLowerCase()}`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                          <div className="patients-order-meta">
                            <span>Rx #{rx.prescriptionNumber || rx.id}</span>
                            <span>
                              Qty: {rx.quantityValue ?? rx.quantity ?? "-"}
                            </span>
                            <span>
                              {rx.created_at
                                ? new Date(rx.created_at).toLocaleDateString()
                                : "-"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Add Patient modal ── */}
      {createModalOpen ? (
        <div className="modal-backdrop" onClick={handleCloseCreateModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add Patient</h3>
                <p>Create a new patient record and save it to the directory.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseCreateModal}
              >
                ×
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
