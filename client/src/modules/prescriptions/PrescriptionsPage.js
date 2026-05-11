import React from "react";
import AppShell from "../../components/AppShell";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import api from "../../services/api.js";
import "./PrescriptionsPage.css";

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
  status: "New",
  verified_by: "",
};

const INITIAL_DRUG_ITEMS = [{ name: "", quantity: "1" }];

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "new") return "New";
  if (["in process", "in_process", "in-process"].includes(normalized))
    return "In Process";
  if (normalized === "ready") return "Ready";
  if (["picked up", "picked_up", "picked-up"].includes(normalized))
    return "Picked Up";
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";
  return "New";
};

const formatReviewStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "not_sent") return "Not Sent";
  if (normalized === "pending") return "Pending";
  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "expired") return "Expired";
  if (normalized === "completed") return "Completed";
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
    created_at: item?.created_at || item?.createdat || null,
    review_history: Array.isArray(item?.reviewHistory)
      ? item.reviewHistory
      : [],
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
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
};

const PrescriptionsPage = () => {
  const [statusTab, setStatusTab] = React.useState("All");
  const [_selectedId, setSelectedId] = React.useState("");
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
  const [drugItems, setDrugItems] = React.useState(INITIAL_DRUG_ITEMS);
  const [saveLoading, setSaveLoading] = React.useState(false);
  const [reviewLoading, setReviewLoading] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [saveSuccess, setSaveSuccess] = React.useState("");

  const [drugAvailability, setDrugAvailability] = React.useState(null);
  const [drugAvailabilityLoading, setDrugAvailabilityLoading] =
    React.useState(false);

  // Per-item lot selection state: { [itemId]: { lotId: "", quantity: "" } }
  const [itemLotSelections, setItemLotSelections] = React.useState({});
  const [itemAssignLoading, setItemAssignLoading] = React.useState({});

  const [dispenseModal, setDispenseModal] = React.useState({
    open: false,
    prescriptionId: null,
  });
  const [dispenseLoading, setDispenseLoading] = React.useState(false);

  const [cancelModal, setCancelModal] = React.useState({
    open: false,
    prescriptionId: null,
  });
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelLoading, setCancelLoading] = React.useState(false);

  const [pickupLoading, setPickupLoading] = React.useState("");
  const [viewModalOpen, setViewModalOpen] = React.useState(false);

  const fetchPrescriptions = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.listPrescriptions({ page: 1, limit: 200 });
      const mapped = (response?.data || []).map(toPrescriptionEntry);
      setPrescriptions(mapped);
      if (!_selectedId && mapped[0]?.prescription_id) {
        setSelectedId(mapped[0].prescription_id);
      }
    } catch (err) {
      setError(err.message || "Failed to load prescriptions.");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [_selectedId]);

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

  const refreshDrugAvailability = React.useCallback(async (id) => {
    if (!id) {
      setDrugAvailability(null);
      return;
    }
    setDrugAvailabilityLoading(true);
    try {
      const res = await api.getDrugAvailability(id);
      setDrugAvailability(res?.data || null);
    } catch {
      setDrugAvailability(null);
    } finally {
      setDrugAvailabilityLoading(false);
    }
  }, []);

  const filtered = React.useMemo(() => prescriptions.filter((item) => {
    const matchesStatus = statusTab === "All" || item.status === statusTab;
    const search = searchQuery.trim().toLowerCase();
    if (!search) return matchesStatus;
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
  }), [prescriptions, statusTab, searchQuery]);

  const selectedId = React.useMemo(() => {
    if (!filtered.length) return "";
    if (filtered.some((i) => i.prescription_id === _selectedId)) return _selectedId;
    return filtered[0]?.prescription_id || "";
  }, [filtered, _selectedId]);

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
    setItemLotSelections({});
    refreshDrugAvailability(selectedId);
  }, [selectedId, refreshDrugAvailability]);

  React.useEffect(() => {
    if (!formOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseForm();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [formOpen]);

  React.useEffect(() => {
    if (!viewModalOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setViewModalOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [viewModalOpen]);

  const selected = prescriptions.find(
    (item) => item.prescription_id === selectedId,
  );

  const getStatusCount = React.useCallback(
    (status) =>
      status === "All"
        ? prescriptions.length
        : prescriptions.filter((item) => item.status === status).length,
    [prescriptions],
  );

  const filteredPrescribers = React.useMemo(() => {
    const search = prescriberSearch.trim().toLowerCase();
    if (!search) return prescribers;
    return prescribers.filter((p) => {
      const name = String(p?.name || "").toLowerCase();
      const email = String(p?.email || "").toLowerCase();
      const npi = String(p?.npi || "").toLowerCase();
      return (
        name.includes(search) || email.includes(search) || npi.includes(search)
      );
    });
  }, [prescriberSearch, prescribers]);

  // ── Form handlers ─────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((cur) => ({ ...cur, [name]: value }));
  };

  const addDrugItem = () =>
    setDrugItems((prev) => [...prev, { name: "", quantity: "1" }]);
  const removeDrugItem = (index) =>
    setDrugItems((prev) => prev.filter((_, i) => i !== index));
  const updateDrugItem = (index, field, value) =>
    setDrugItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );

  const handleOpenForm = () => {
    setFormData(INITIAL_FORM);
    setDrugItems(INITIAL_DRUG_ITEMS);
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

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const validItems = drugItems.filter((item) =>
        String(item.name || "").trim(),
      );
      if (!validItems.length) {
        setSaveError("At least one drug name is required.");
        return;
      }
      const payload = {
        patient_id: formData.patient_id,
        prescriber_id: formData.prescriber_id || null,
        drug_items: validItems.map((item) => ({
          name: String(item.name).trim(),
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        })),
        status: formData.status,
        verified_by: formData.verified_by || null,
      };
      const response = await api.createPrescriptionEntry(payload);
      setSaveSuccess(response?.message || "Prescription added successfully.");
      const created = response?.data;
      if (created?.prescription_id) setSelectedId(created.prescription_id);
      await fetchPrescriptions();
      setFormOpen(false);
      setFormData(INITIAL_FORM);
      setDrugItems(INITIAL_DRUG_ITEMS);
    } catch (err) {
      setSaveError(err.message || "Failed to create prescription.");
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Review ────────────────────────────────────────────────────────
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

  // ── Lot assignment (In Process) ───────────────────────────────────
  const handleAssignLot = async (prescriptionId, itemId) => {
    const selection = itemLotSelections[itemId] || {};
    setItemAssignLoading((prev) => ({ ...prev, [itemId]: true }));
    setSaveError("");
    try {
      const response = await api.assignItemLot(prescriptionId, itemId, {
        lotId: selection.lotId ? Number(selection.lotId) : null,
        quantity: Number(selection.quantity) || null,
      });
      setSaveSuccess(response?.message || "Lot assigned.");
      await refreshDrugAvailability(prescriptionId);
    } catch (err) {
      setSaveError(err.message || "Failed to assign lot.");
    } finally {
      setItemAssignLoading((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  // ── Mark Ready ────────────────────────────────────────────────────
  const openDispenseModal = (prescriptionId) => {
    setDispenseModal({ open: true, prescriptionId });
    setSaveError("");
  };

  const closeDispenseModal = () =>
    setDispenseModal({ open: false, prescriptionId: null });

  const handleMarkReady = async () => {
    setDispenseLoading(true);
    setSaveError("");
    try {
      const response = await api.markPrescriptionReady(
        dispenseModal.prescriptionId,
      );
      setSaveSuccess(response?.message || "Prescription marked as Ready.");
      closeDispenseModal();
      await fetchPrescriptions();
    } catch (err) {
      setSaveError(err.message || "Failed to mark prescription as Ready.");
    } finally {
      setDispenseLoading(false);
    }
  };

  // ── Pickup ────────────────────────────────────────────────────────
  const handlePickedUp = async (prescriptionId) => {
    if (!window.confirm("Confirm patient has picked up this prescription?"))
      return;
    setPickupLoading(prescriptionId);
    setSaveError("");
    setSaveSuccess("");
    try {
      const response = await api.markPrescriptionPickedUp(prescriptionId);
      setSaveSuccess(response?.message || "Prescription marked as Picked Up.");
      await fetchPrescriptions();
    } catch (err) {
      setSaveError(err.message || "Failed to mark prescription as Picked Up.");
    } finally {
      setPickupLoading("");
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────
  const openCancelModal = (prescriptionId) => {
    setCancelModal({ open: true, prescriptionId });
    setCancelReason("");
    setSaveError("");
  };
  const closeCancelModal = () => {
    setCancelModal({ open: false, prescriptionId: null });
    setCancelReason("");
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    setCancelLoading(true);
    setSaveError("");
    try {
      const response = await api.cancelPrescription(
        cancelModal.prescriptionId,
        cancelReason,
      );
      setSaveSuccess(response?.message || "Prescription cancelled.");
      closeCancelModal();
      await fetchPrescriptions();
    } catch (err) {
      setSaveError(err.message || "Failed to cancel prescription.");
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Medicines panel helpers ───────────────────────────────────────
  const renderMedicinesPanel = () => {
    if (drugAvailabilityLoading) {
      return <p className="prescription-avail-loading">Checking inventory…</p>;
    }
    if (!drugAvailability) {
      return (
        <p className="prescription-avail-loading">
          Inventory data unavailable.
        </p>
      );
    }

    const itemsToShow = drugAvailability.items?.length
      ? drugAvailability.items
      : null;

    if (!itemsToShow) {
      // Legacy single-drug fallback
      const { drug, available, lots, alternatives } = drugAvailability;
      if (!drug)
        return (
          <p className="prescription-avail-loading">
            No drug information available.
          </p>
        );
      return (
        <div className="prescription-avail-card">
          <div className="prescription-avail-drug">
            <strong>{drug.brandname}</strong>
            {drug.genericname &&
              drug.genericname.toLowerCase() !==
                drug.brandname?.toLowerCase() && (
                <span className="prescription-avail-generic">
                  Generic: {drug.genericname}
                </span>
              )}
          </div>
          {available ? (
            <div className="prescription-avail-status">
              <span className="prescription-avail-badge available">
                In Stock
              </span>
              <ul className="prescription-avail-lots">
                {lots.map((lot) => (
                  <li key={lot.id}>
                    Lot <strong>{lot.lotNumber}</strong> — {lot.quantityOnHand}{" "}
                    units · exp {lot.expiryDate}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="prescription-avail-status">
              <span className="prescription-avail-badge unavailable">
                Out of Stock
              </span>
              {alternatives.length > 0 ? (
                <div className="prescription-avail-alts">
                  <p>Available alternatives:</p>
                  {alternatives.map((alt) => (
                    <div
                      key={alt.drug.id}
                      className="prescription-avail-alt-item"
                    >
                      <strong>{alt.drug.brandname}</strong>
                      <span>{alt.drug.genericname}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="prescription-avail-hint">
                  No stock found. Check for a similar or generic equivalent.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    const isInProcess = selected?.status === "In Process";

    return (
      <div className="prescription-avail-card">
        {itemsToShow.map((item) => {
          const sel = itemLotSelections[item.itemId] || {};
          const allAvailableLots = [
            ...item.lots,
            ...item.alternatives.flatMap((alt) =>
              alt.lots.map((l) => ({ ...l, altDrug: alt.drug })),
            ),
          ];

          return (
            <div key={item.itemId} className="prescription-avail-drug-item">
              <div className="prescription-avail-drug">
                <strong>{item.drug?.brandname || `Drug ${item.drugId}`}</strong>
                {item.drug?.genericname &&
                  item.drug.genericname.toLowerCase() !==
                    item.drug.brandname?.toLowerCase() && (
                    <span className="prescription-avail-generic">
                      Generic: {item.drug.genericname}
                    </span>
                  )}
                {item.drug?.dosageform && (
                  <span className="prescription-avail-meta">
                    {item.drug.dosageform}
                    {item.drug.route ? ` · ${item.drug.route}` : ""}
                  </span>
                )}
                <span className="prescription-avail-meta">
                  Qty prescribed: {item.quantity}
                </span>
              </div>

              {item.available ? (
                <div className="prescription-avail-status">
                  <span className="prescription-avail-badge available">
                    In Stock
                  </span>

                  {item.lotId && item.lot ? (
                    <p
                      className="prescription-avail-meta"
                      style={{ margin: "0.35rem 0 0" }}
                    >
                      Blocked: Lot <strong>{item.lot.lotNumber}</strong> ×{" "}
                      {item.quantityBlocked} units
                    </p>
                  ) : null}

                  {isInProcess ? (
                    <div className="prescription-avail-lot-assign">
                      <select
                        value={
                          sel.lotId !== undefined ? sel.lotId : item.lotId || ""
                        }
                        onChange={(e) =>
                          setItemLotSelections((prev) => ({
                            ...prev,
                            [item.itemId]: {
                              lotId: e.target.value,
                              quantity: item.quantity,
                            },
                          }))
                        }
                      >
                        <option value="">— Select lot to block —</option>
                        {item.lots.map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lotNumber} | Qty: {lot.quantityOnHand} | Exp:{" "}
                            {lot.expiryDate}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="prescription-block-btn"
                        onClick={() =>
                          handleAssignLot(selected.prescription_id, item.itemId)
                        }
                        disabled={itemAssignLoading[item.itemId]}
                      >
                        {itemAssignLoading[item.itemId]
                          ? "Saving…"
                          : item.lotId
                            ? "Update"
                            : "Block Qty"}
                      </button>
                    </div>
                  ) : (
                    !item.lotId && (
                      <ul className="prescription-avail-lots">
                        {item.lots.map((lot) => (
                          <li key={lot.id}>
                            Lot <strong>{lot.lotNumber}</strong> —{" "}
                            {lot.quantityOnHand} units · exp {lot.expiryDate}
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              ) : (
                <div className="prescription-avail-status">
                  <span className="prescription-avail-badge unavailable">
                    Out of Stock
                  </span>
                  {item.alternatives.length > 0 ? (
                    <div className="prescription-avail-alts">
                      <p>Alternatives with same generic name:</p>
                      {item.alternatives.map((alt) => (
                        <div
                          key={alt.drug.id}
                          className="prescription-avail-alt-item"
                        >
                          <strong>{alt.drug.brandname}</strong>
                          <span>{alt.drug.genericname}</span>
                          {isInProcess ? (
                            <div
                              className="prescription-avail-lot-assign"
                              style={{ marginTop: "0.35rem" }}
                            >
                              <select
                                value={sel.lotId || ""}
                                onChange={(e) =>
                                  setItemLotSelections((prev) => ({
                                    ...prev,
                                    [item.itemId]: {
                                      lotId: e.target.value,
                                      quantity: item.quantity,
                                    },
                                  }))
                                }
                              >
                                <option value="">
                                  — Use this alternative —
                                </option>
                                {alt.lots.map((lot) => (
                                  <option key={lot.id} value={lot.id}>
                                    {lot.lotNumber} | Qty: {lot.quantityOnHand}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="prescription-block-btn"
                                onClick={() =>
                                  handleAssignLot(
                                    selected.prescription_id,
                                    item.itemId,
                                  )
                                }
                                disabled={itemAssignLoading[item.itemId]}
                              >
                                {itemAssignLoading[item.itemId]
                                  ? "Saving…"
                                  : "Block Qty"}
                              </button>
                            </div>
                          ) : (
                            <ul>
                              {alt.lots.map((lot) => (
                                <li key={lot.id}>
                                  Lot {lot.lotNumber} — {lot.quantityOnHand}{" "}
                                  units
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="prescription-avail-hint">
                      No stock found. Check for a similar or generic equivalent
                      in inventory.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <AppShell title="Prescriptions">
      <div className="prescription-page">
        <div className="pg-head">
          <button
            className="prescription-primary-btn"
            onClick={handleOpenForm}
          >
            + Add Prescription
          </button>
        </div>

        <Card>
          <div className="prescription-search" style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, drug, or Rx #…"
            />
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
          <div className="prescription-list-area">
          {loading ? (
            <div className="prescription-message">Loading prescriptions…</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No prescriptions"
              description={statusTab === "All" ? "Add a prescription to get started." : `No ${statusTab.toLowerCase()} prescriptions.`}
            />
          ) : (
            <div className="prescription-list">
              {filtered.map((item) => (
                <button
                  key={item.prescription_id}
                  className={`prescription-list-item ${selectedId === item.prescription_id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(item.prescription_id);
                    setSaveError("");
                    setSaveSuccess("");
                    setViewModalOpen(true);
                  }}
                >
                  <strong>{item.patient_name}</strong>
                  <p>{item.drug_name.join(", ") || "No drugs listed"}</p>
                  <div className="prescription-list-item-meta">
                    <span className="prescription-meta-pill">
                      Rx #{item.prescription_number}
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
                      className={`prescription-status ${item.status.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
        </Card>
      </div>

      {/* ── View Prescription modal ── */}
      {viewModalOpen && selected ? (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Prescription Details</h3>
                <p>Rx #{selected.prescription_number} · {selected.patient_name}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setViewModalOpen(false)}>×</button>
            </div>

            {/* Tab strip — Details | Review History | Audit */}
            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab${activeTab === "details" ? " active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              <button
                type="button"
                className={`modal-tab${activeTab === "reviews" ? " active" : ""}`}
                onClick={() => setActiveTab("reviews")}
              >
                Review History
                {selected.review_history.length > 0 && (
                  <span style={{ marginLeft: "0.4rem", background: "var(--navy)", color: "#fff", borderRadius: "999px", fontSize: "0.7rem", padding: "0.05rem 0.45rem" }}>
                    {selected.review_history.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`modal-tab${activeTab === "audit" ? " active" : ""}`}
                onClick={() => setActiveTab("audit")}
              >
                Audit
              </button>
            </div>

            {saveError ? (
              <div className="prescription-message error">{saveError}</div>
            ) : null}

            {/* ── Details tab ── */}
            {activeTab === "details" && (
              <>
                <div className="detail-grid">
                  <div>
                    <span>Rx Number</span>
                    <strong>{selected.prescription_number || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Patient</span>
                    <strong>{selected.patient_name}</strong>
                  </div>
                  <div>
                    <span>Prescriber ID</span>
                    <strong>{selected.prescriber_id || "N/A"}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>
                      <span className={`badge badge-${selected.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {selected.status}
                      </span>
                    </strong>
                  </div>
                  <div className="detail-grid-span2">
                    <span>Medications</span>
                    <strong>{selected.drug_name.join(", ") || "N/A"}</strong>
                  </div>
                </div>

                <div className="prescription-medicines-panel">
                  <h4>Medicines &amp; Inventory</h4>
                  {renderMedicinesPanel()}
                </div>

                {["New", "In Process", "Ready"].includes(selected.status) && (
                  <div className="modal-footer">
                    {selected.status === "New" && (
                      <button
                        type="button"
                        className="prescription-secondary-btn"
                        onClick={() => handleSendForReview(selected.prescription_id)}
                        disabled={reviewLoading === selected.prescription_id}
                      >
                        {reviewLoading === selected.prescription_id ? "Sending…" : "Send for Review"}
                      </button>
                    )}
                    {selected.status === "In Process" && (
                      <button
                        type="button"
                        className="prescription-secondary-btn"
                        onClick={() => openDispenseModal(selected.prescription_id)}
                      >
                        Mark as Ready
                      </button>
                    )}
                    {selected.status === "Ready" && (
                      <button
                        type="button"
                        className="prescription-secondary-btn"
                        onClick={() => handlePickedUp(selected.prescription_id)}
                        disabled={pickupLoading === selected.prescription_id}
                      >
                        {pickupLoading === selected.prescription_id ? "Recording…" : "Record Pickup"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="prescription-danger-btn"
                      onClick={() => openCancelModal(selected.prescription_id)}
                    >
                      Cancel Prescription
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Review History tab ── */}
            {activeTab === "reviews" && (
              <>
                {/* Summary row */}
                <div className="detail-grid detail-grid-3" style={{ marginBottom: "1.25rem" }}>
                  <div>
                    <span>Review Status</span>
                    <strong>{formatReviewStatus(selected.review_summary?.latestStatus)}</strong>
                  </div>
                  <div>
                    <span>Last Recipient</span>
                    <strong>
                      {selected.latest_review?.recipientName ||
                        selected.latest_review?.recipientEmail ||
                        "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Last Sent</span>
                    <strong>{formatDateTime(selected.review_summary?.latestSentAt)}</strong>
                  </div>
                </div>

                {selected.review_history.length === 0 ? (
                  <EmptyState
                    title="No review requests sent"
                    description="When this prescription is sent for review, the history will appear here."
                  />
                ) : (
                  <div className="review-history-list">
                    {selected.review_history.map((entry) => (
                      <div key={entry.id} className="review-history-item">
                        <div className="review-history-topline">
                          <strong>{entry.recipientName || entry.recipientEmail || "Prescriber"}</strong>
                          <span className={`prescription-review-pill ${String(entry.status || "not_sent").toLowerCase().replace(/\s+/g, "-")}`}>
                            {formatReviewStatus(entry.status)}
                          </span>
                        </div>
                        {entry.recipientEmail && (
                          <p className="review-history-email">{entry.recipientEmail}</p>
                        )}
                        <div className="review-history-meta">
                          <span>Sent: {formatDateTime(entry.sentAt)}</span>
                          <span>Reviewed: {formatDateTime(entry.usedAt)}</span>
                          <span>Expires: {formatDateTime(entry.expiresAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Audit tab ── */}
            {activeTab === "audit" && (
              <div className="detail-grid">
                <div>
                  <span>Created At</span>
                  <strong>{formatDateTime(selected.created_at)}</strong>
                </div>
                <div>
                  <span>Pharmacy</span>
                  <strong>{selected.pharmacy_id || "N/A"}</strong>
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
                  <span>Latest Review Status</span>
                  <strong>{formatReviewStatus(selected.review_summary?.latestStatus)}</strong>
                </div>
                <div>
                  <span>Last Sent For Review</span>
                  <strong>{formatDateTime(selected.review_summary?.latestSentAt)}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Add Prescription modal ── */}
      {formOpen ? (
        <div className="modal-backdrop" onClick={handleCloseForm}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="prescription-modal-title-group">
                <div className="prescription-modal-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <h3>Add Prescription</h3>
                  <p>Create a new prescription entry for the workflow queue.</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={handleCloseForm}>×</button>
            </div>

            {saveError ? (
              <div className="prescription-message error">{saveError}</div>
            ) : null}

            <form className="prescription-form" onSubmit={handleCreatePrescription}>

              {/* ── Section 1: Patient ── */}
              <div className="prescription-form-section">
                <p className="prescription-form-section-title">
                  <span className="prescription-form-step">1</span>
                  Patient &amp; Status
                </p>
                <div className="prescription-form-grid">
                  <label>
                    Patient
                    <select
                      name="patient_id"
                      value={formData.patient_id}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">— Select patient —</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName} · {patient.patientNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Initial Status
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleFormChange}
                      required
                    >
                      {STATUS_TABS.filter((s) => s !== "All").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* ── Section 2: Prescriber ── */}
              <div className="prescription-form-section">
                <p className="prescription-form-section-title">
                  <span className="prescription-form-step">2</span>
                  Prescriber &amp; Verification
                </p>
                <label>
                  <span className="prescription-form-label-row">
                    Prescriber
                    <small className="prescription-form-optional">optional</small>
                  </span>
                  <input
                    value={prescriberSearch}
                    onChange={(e) => setPrescriberSearch(e.target.value)}
                    placeholder="Search by name, email, or NPI…"
                  />
                  <select
                    name="prescriber_id"
                    value={formData.prescriber_id}
                    onChange={handleFormChange}
                  >
                    <option value="">— Select prescriber —</option>
                    {filteredPrescribers.map((prescriber) => (
                      <option key={prescriber.id} value={prescriber.npi}>
                        {prescriber.name} · NPI {prescriber.npi}
                      </option>
                    ))}
                  </select>
                  <small className="prescription-form-field-hint">
                    {prescribersLoading ? "Loading prescribers…" : `${filteredPrescribers.length} prescriber(s) available`}
                  </small>
                </label>
                <label>
                  <span className="prescription-form-label-row">
                    Verified By
                    <small className="prescription-form-optional">optional</small>
                  </span>
                  <input
                    name="verified_by"
                    value={formData.verified_by}
                    onChange={handleFormChange}
                    placeholder="Pharmacist name or email"
                  />
                </label>
              </div>

              {/* ── Section 3: Medications ── */}
              <div className="prescription-form-section">
                <p className="prescription-form-section-title">
                  <span className="prescription-form-step">3</span>
                  Medications
                </p>
                {drugItems.map((item, index) => (
                  <div key={index} className="prescription-drug-item-row">
                    <span className="prescription-drug-index">{index + 1}</span>
                    <input
                      value={item.name}
                      onChange={(e) => updateDrugItem(index, "name", e.target.value)}
                      placeholder={index === 0 ? "Drug name, strength, form (e.g. Amoxicillin 500mg Capsule)" : "Drug name…"}
                      required={index === 0}
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateDrugItem(index, "quantity", e.target.value)}
                      placeholder="Qty"
                      required
                    />
                    {drugItems.length > 1 ? (
                      <button
                        type="button"
                        className="prescription-remove-drug-btn"
                        onClick={() => removeDrugItem(index)}
                        aria-label="Remove medication"
                      >
                        ×
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
                <button type="button" className="prescription-add-drug-btn" onClick={addDrugItem}>
                  + Add another medication
                </button>
              </div>

              <div className="modal-footer">
                <button type="button" className="prescription-secondary-btn" onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className="prescription-primary-btn" disabled={saveLoading}>
                  {saveLoading ? "Saving…" : "Create Prescription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Mark as Ready confirmation modal ── */}
      {dispenseModal.open ? (
        <div className="modal-backdrop" onClick={closeDispenseModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Mark as Ready</h3>
                <p>
                  Blocked inventory quantities will be deducted from their
                  assigned lots.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeDispenseModal}
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="prescription-message error">{saveError}</div>
            ) : null}

            {drugAvailability?.items?.filter(
              (i) => i.lotId && i.quantityBlocked > 0,
            ).length > 0 ? (
              <div
                className="prescription-message"
                style={{ marginBottom: "1rem" }}
              >
                <strong>Inventory deductions on confirm:</strong>
                <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                  {drugAvailability.items
                    .filter((i) => i.lotId && i.quantityBlocked > 0)
                    .map((i) => (
                      <li key={i.itemId}>
                        {i.drug?.brandname || `Drug ${i.drugId}`} — Lot{" "}
                        {i.lot?.lotNumber} × {i.quantityBlocked} units
                      </li>
                    ))}
                </ul>
                {drugAvailability.items.filter((i) => !i.lotId).length > 0 && (
                  <p
                    style={{
                      margin: "0.5rem 0 0",
                      color: "var(--text-light)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {drugAvailability.items.filter((i) => !i.lotId).length}{" "}
                    item(s) have no lot assigned — no deduction for those.
                  </p>
                )}
              </div>
            ) : (
              <div className="prescription-message">
                No lots are blocked for this prescription. Marking as Ready
                without any inventory deduction.
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="prescription-secondary-btn"
                onClick={closeDispenseModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="prescription-primary-btn"
                onClick={handleMarkReady}
                disabled={dispenseLoading}
              >
                {dispenseLoading ? "Saving…" : "Confirm Ready"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Cancel Prescription modal ── */}
      {cancelModal.open ? (
        <div className="modal-backdrop" onClick={closeCancelModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Cancel Prescription</h3>
                <p>
                  Provide a reason for cancellation. Any blocked inventory will
                  be released.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeCancelModal}
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="prescription-message error">{saveError}</div>
            ) : null}

            <form className="prescription-form" onSubmit={handleCancel}>
              <div className="prescription-form-grid">
                <label>
                  Reason
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Patient requested cancellation"
                    required
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="prescription-secondary-btn"
                  onClick={closeCancelModal}
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="prescription-danger-btn"
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling…" : "Confirm Cancel"}
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
