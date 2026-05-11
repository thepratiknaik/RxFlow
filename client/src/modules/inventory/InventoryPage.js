import React from "react";
import AppShell from "../../components/AppShell.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "./InventoryPage.css";

const EMPTY_LOT_FORM = {
  drugId: "",
  lotNumber: "",
  expiryDate: "",
  quantityOnHand: "0",
  minimumLevel: "10",
};

const getLotStatus = (lot) => {
  const expiryValue = lot?.expiryDate
    ? new Date(`${lot.expiryDate}T00:00:00`)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiryValue && !Number.isNaN(expiryValue.getTime())) {
    if (expiryValue.getTime() < today.getTime()) {
      return { tone: "expired", label: "Expired" };
    }

    const daysUntilExpiry = Math.ceil(
      (expiryValue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 30) {
      return { tone: "expiring", label: "Expiring soon" };
    }
  }

  if (lot?.belowThreshold) {
    return { tone: "low", label: "Low stock" };
  }

  return { tone: "ok", label: "Stable" };
};

const InventoryPage = () => {
  const { user } = useAuth();
  const canPullDrugs = ["admin", "pharmacist"].includes(
    String(user?.role || "").toLowerCase(),
  );
  const canManageLots = canPullDrugs;
  const canViewAuditLogs = canPullDrugs;

  const [lots, setLots] = React.useState([]);
  const [lotsSummary, setLotsSummary] = React.useState({
    belowThresholdTotal: 0,
    totalLotRows: 0,
  });
  const [lotsLoading, setLotsLoading] = React.useState(true);
  const [lotsError, setLotsError] = React.useState("");
  const [lotsFilterLow, setLotsFilterLow] = React.useState(false);
  const [selectedLotId, setSelectedLotId] = React.useState("");
  const [lotForm, setLotForm] = React.useState(EMPTY_LOT_FORM);
  const [lotFormMode, setLotFormMode] = React.useState("create");
  const [lotSaving, setLotSaving] = React.useState(false);
  const [lotDeleting, setLotDeleting] = React.useState(false);
  const [lotMessage, setLotMessage] = React.useState({ tone: "", text: "" });

  const [drugs, setDrugs] = React.useState([]);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const [pullForm, setPullForm] = React.useState({
    searchTerm: "",
    limit: 25,
  });
  const [pullLoading, setPullLoading] = React.useState(false);
  const [pullError, setPullError] = React.useState("");
  const [pullSuccess, setPullSuccess] = React.useState("");
  const [latestJobId, setLatestJobId] = React.useState("");

  const [jobs, setJobs] = React.useState([]);
  const [jobsSummary, setJobsSummary] = React.useState({
    total: 0,
    byState: {},
  });
  const [jobsLoading, setJobsLoading] = React.useState(false);
  const [jobsError, setJobsError] = React.useState("");

  const [auditLogs, setAuditLogs] = React.useState([]);

  const [activeTab, setActiveTab] = React.useState("lots");
  const [lotModalOpen, setLotModalOpen] = React.useState(false);
  const [pullModalOpen, setPullModalOpen] = React.useState(false);

  const selectedLot = lots.find((lot) => lot.id === selectedLotId) || null;

  const hydrateLotForm = React.useCallback((lot) => {
    if (!lot) {
      setLotForm(EMPTY_LOT_FORM);
      return;
    }

    setLotForm({
      drugId: lot.drugId || "",
      lotNumber: lot.lotNumber || "",
      expiryDate: lot.expiryDate || "",
      quantityOnHand: String(lot.quantityOnHand ?? 0),
      minimumLevel: String(lot.minimumLevel ?? 10),
    });
  }, []);

  const fetchLots = React.useCallback(async () => {
    setLotsLoading(true);
    setLotsError("");

    try {
      const response = await api.listInventoryLots({
        page: 1,
        limit: 200,
        belowThreshold: lotsFilterLow,
      });

      const nextLots = response?.data || [];
      setLots(nextLots);
      setLotsSummary(
        response?.summary || { belowThresholdTotal: 0, totalLotRows: 0 },
      );
      setSelectedLotId((current) => {
        if (!nextLots.length) {
          return "";
        }

        return nextLots.some((lot) => lot.id === current)
          ? current
          : nextLots[0].id;
      });
    } catch (err) {
      setLotsError(err.message || "Failed to load stock lots.");
      setLots([]);
    } finally {
      setLotsLoading(false);
    }
  }, [lotsFilterLow]);

  React.useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  const fetchDrugs = React.useCallback(async (page, search) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.listDrugs({
        page,
        limit: 10,
        search,
      });

      setDrugs(response?.data || []);
      setPagination(
        response?.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobData = React.useCallback(async () => {
    if (!canPullDrugs) {
      return;
    }

    setJobsLoading(true);
    setJobsError("");

    try {
      const jobsResponse = await api.listDrugPullJobs({ limit: 5 });

      setJobs(jobsResponse?.data || []);
      setJobsSummary(jobsResponse?.summary || { total: 0, byState: {} });
    } catch (err) {
      setJobsError(err.message || "Failed to load pull activity.");
    } finally {
      setJobsLoading(false);
    }
  }, [canPullDrugs]);

  const fetchAuditLogs = React.useCallback(async () => {
    if (!canViewAuditLogs) {
      setAuditLogs([]);
      return;
    }

    try {
      const response = await api.listAuditLogs({
        page: 1,
        limit: 6,
        q: "inventory",
      });
      setAuditLogs(response?.data || []);
    } catch {
      setAuditLogs([]);
    }
  }, [canViewAuditLogs]);

  React.useEffect(() => {
    fetchDrugs(pagination.page, searchQuery);
  }, [fetchDrugs, pagination.page, searchQuery]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPagination((c) => ({ ...c, page: 1 }));
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  React.useEffect(() => {
    fetchJobData();
    fetchAuditLogs();
  }, [fetchAuditLogs, fetchJobData]);

  React.useEffect(() => {
    if (!selectedLot) {
      return;
    }

    if (lotFormMode === "edit") {
      hydrateLotForm(selectedLot);
    }
  }, [hydrateLotForm, lotFormMode, selectedLot]);

  React.useEffect(() => {
    if (!latestJobId || !canPullDrugs) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await api.getDrugPullJob(latestJobId);
        const state = response?.data?.state;

        if (state && !["waiting", "active", "delayed"].includes(state)) {
          await Promise.all([
            fetchJobData(),
            fetchDrugs(1, searchQuery),
            fetchAuditLogs(),
          ]);
          setLatestJobId("");
        } else {
          fetchJobData();
        }
      } catch {
        setLatestJobId("");
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [
    canPullDrugs,
    fetchAuditLogs,
    fetchDrugs,
    fetchJobData,
    latestJobId,
    searchQuery,
  ]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();

    if (pagination.page === 1 && nextQuery === searchQuery) {
      fetchDrugs(1, nextQuery);
      return;
    }

    setPagination((current) => ({ ...current, page: 1 }));
    setSearchQuery(nextQuery);
  };

  const handleLotFormChange = (event) => {
    const { name, value } = event.target;
    setLotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCloseLotModal = () => {
    setLotModalOpen(false);
    setLotFormMode("create");
    setLotForm(EMPTY_LOT_FORM);
    setSelectedLotId("");
    setLotMessage({ tone: "", text: "" });
  };

  const handleCreateNewLot = () => {
    setLotFormMode("create");
    setSelectedLotId("");
    setLotMessage({ tone: "", text: "" });
    setLotForm(EMPTY_LOT_FORM);
    setLotModalOpen(true);
  };

  const handleEditSelectedLot = (lot) => {
    if (!lot) {
      return;
    }

    setSelectedLotId(lot.id);
    setLotFormMode("edit");
    setLotMessage({ tone: "", text: "" });
    hydrateLotForm(lot);
    setLotModalOpen(true);
  };

  const handleLotSubmit = async (event) => {
    event.preventDefault();
    setLotMessage({ tone: "", text: "" });
    setLotSaving(true);

    const payload = {
      drugId: Number(lotForm.drugId),
      lotNumber: lotForm.lotNumber.trim(),
      expiryDate: lotForm.expiryDate,
      quantityOnHand: Number(lotForm.quantityOnHand) || 0,
      minimumLevel: Number(lotForm.minimumLevel) || 10,
    };

    try {
      if (lotFormMode === "edit" && selectedLotId) {
        await api.updateInventoryLot(selectedLotId, payload);
        setLotMessage({ tone: "success", text: "Stock lot updated." });
      } else {
        await api.createInventoryLot(payload);
        setLotMessage({ tone: "success", text: "Stock lot added." });
      }

      await Promise.all([fetchLots(), fetchAuditLogs()]);
      setLotFormMode("create");
      setLotForm(EMPTY_LOT_FORM);
      setSelectedLotId("");
      setLotModalOpen(false);
    } catch (err) {
      setLotMessage({
        tone: "error",
        text: err.message || "Could not save stock lot.",
      });
    } finally {
      setLotSaving(false);
    }
  };

  const handleDeleteLot = async () => {
    if (!selectedLotId) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this stock lot? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setLotDeleting(true);
    setLotMessage({ tone: "", text: "" });

    try {
      await api.deleteInventoryLot(selectedLotId);
      setLotMessage({ tone: "success", text: "Stock lot deleted." });
      setLotFormMode("create");
      setLotForm(EMPTY_LOT_FORM);
      setSelectedLotId("");
      setLotModalOpen(false);
      await Promise.all([fetchLots(), fetchAuditLogs()]);
    } catch (err) {
      setLotMessage({
        tone: "error",
        text: err.message || "Could not delete stock lot.",
      });
    } finally {
      setLotDeleting(false);
    }
  };

  const handlePullSubmit = async (event) => {
    event.preventDefault();
    setPullLoading(true);
    setPullError("");
    setPullSuccess("");

    try {
      const response = await api.pullDrugs({
        searchTerm: pullForm.searchTerm,
        limit: Number(pullForm.limit) || 25,
      });

      const jobId = response?.data?.jobId || "";
      setLatestJobId(jobId);
      setPullSuccess(response?.message || "Drug pull job queued successfully.");
      setPullModalOpen(false);
      await Promise.all([fetchJobData(), fetchAuditLogs()]);
    } catch (err) {
      setPullError(err.message || "Failed to queue drug pull.");
    } finally {
      setPullLoading(false);
    }
  };

  return (
    <AppShell title="Inventory">
      <div className="inventory-page">
        <div className="pg-head">
          <div
            style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}
          >
            {activeTab === "lots" && canManageLots ? (
              <button
                type="button"
                className="inventory-secondary-action"
                onClick={handleCreateNewLot}
              >
                + New Lot
              </button>
            ) : null}
            {activeTab === "catalog" && canPullDrugs ? (
              <button
                type="button"
                className="inventory-secondary-action"
                onClick={() => setPullModalOpen(true)}
              >
                ↻ Pull Catalog
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Tab strip ─────────────────────────────────────────────── */}
        <div className="inventory-tabs">
          <button
            className={activeTab === "lots" ? "active" : ""}
            onClick={() => setActiveTab("lots")}
          >
            Stock Lots
            {lotsSummary.belowThresholdTotal > 0 ? (
              <em>{lotsSummary.belowThresholdTotal} at risk</em>
            ) : null}
          </button>
          <button
            className={activeTab === "catalog" ? "active" : ""}
            onClick={() => setActiveTab("catalog")}
          >
            Drug Catalog
          </button>
          {canViewAuditLogs ? (
            <button
              className={activeTab === "audit" ? "active" : ""}
              onClick={() => setActiveTab("audit")}
            >
              Audit Log
              {jobs.length > 0 ? <em>{jobs.length} jobs</em> : null}
            </button>
          ) : null}
        </div>

        {/* ── Stock Lots tab ─────────────────────────────────────────── */}
        {activeTab === "lots" ? (
          <Card>
            <div className="inventory-lots-toolbar">
              <label className="inventory-lots-toggle">
                <input
                  type="checkbox"
                  checked={lotsFilterLow}
                  onChange={(event) => setLotsFilterLow(event.target.checked)}
                />
                Show only below minimum
              </label>
              <div className="inventory-summary">
                <span>{lots.length} visible</span>
                {lotsSummary.belowThresholdTotal > 0 ? (
                  <span className="inventory-alert-pill">
                    {lotsSummary.belowThresholdTotal} at risk
                  </span>
                ) : null}
              </div>
            </div>

            {lotsError ? (
              <div className="inventory-message error">{lotsError}</div>
            ) : null}

            {lotsLoading ? (
              <div className="inventory-message">Loading stock lots…</div>
            ) : lots.length === 0 ? (
              <EmptyState
                title="No stock lots"
                description='Click "New Lot" to add your first stock lot.'
              />
            ) : (
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Qty</th>
                      <th>Minimum</th>
                      <th>Lot #</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      {canManageLots ? <th></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => {
                      const lotStatus = getLotStatus(lot);
                      return (
                        <tr
                          key={lot.id}
                          className={
                            lot.belowThreshold ? "inventory-row-low" : ""
                          }
                        >
                          <td>
                            <div className="inventory-drug-name">
                              {lot.drugDisplayName || "—"}
                            </div>
                            <div className="inventory-drug-ndc">
                              {lot.drug?.productndc || ""}
                            </div>
                          </td>
                          <td>{lot.quantityOnHand}</td>
                          <td>{lot.minimumLevel}</td>
                          <td className="inventory-mono">{lot.lotNumber}</td>
                          <td>{lot.expiryDate || "—"}</td>
                          <td>
                            <span
                              className={`inventory-status-badge inventory-status-${lotStatus.tone}`}
                            >
                              {lotStatus.label}
                            </span>
                          </td>
                          {canManageLots ? (
                            <td>
                              <button
                                type="button"
                                className="inventory-inline-btn"
                                onClick={() => handleEditSelectedLot(lot)}
                              >
                                Edit
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : null}

        {/* ── Drug Catalog tab ───────────────────────────────────────── */}
        {activeTab === "catalog" ? (
          <Card>
            <form
              className="inventory-search"
              onSubmit={(e) => e.preventDefault()}
              style={{ marginBottom: "1rem" }}
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search generic name, brand, or NDC"
                style={{ width: "100%" }}
              />
            </form>
            <div className="inventory-section-header">
              <div>
                <h3>Drug Catalog</h3>
                <span className="inventory-subtitle">
                  Click "Use for lot" to prefill the New Lot form with a drug
                  from the catalog.
                </span>
              </div>
              <div className="inventory-summary">
                <span>{pagination.total} total</span>
              </div>
            </div>

            {error ? (
              <div className="inventory-message error">{error}</div>
            ) : null}

            {loading ? (
              <div className="inventory-message">Loading catalog…</div>
            ) : drugs.length === 0 ? (
              <EmptyState
                title="No results"
                description="Try a different query or pull a fresh catalog from the Pull Jobs tab."
              />
            ) : (
              <>
                <div className="inventory-table-wrap">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>Generic</th>
                        <th>Brand</th>
                        <th>NDC</th>
                        <th>Dosage Form</th>
                        <th>Route</th>
                        {canManageLots ? <th></th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {drugs.map((drug) => (
                        <tr key={drug.id}>
                          <td>{drug.genericname || "—"}</td>
                          <td>{drug.brandname || "—"}</td>
                          <td>{drug.productndc || "—"}</td>
                          <td>{drug.dosageform || "—"}</td>
                          <td>{drug.route || "—"}</td>
                          {canManageLots ? (
                            <td>
                              <button
                                type="button"
                                className="inventory-inline-btn"
                                onClick={() => {
                                  setLotFormMode("create");
                                  setSelectedLotId("");
                                  setLotMessage({ tone: "", text: "" });
                                  setLotForm((cur) => ({
                                    ...cur,
                                    drugId: drug.id,
                                  }));
                                  setLotModalOpen(true);
                                }}
                              >
                                Use for lot
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="inventory-pagination">
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((c) => ({
                        ...c,
                        page: Math.max(c.page - 1, 1),
                      }))
                    }
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((c) => ({
                        ...c,
                        page: Math.min(c.page + 1, c.totalPages || 1),
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {/* ── Audit Log tab (includes pull jobs) ────────────────────── */}
        {activeTab === "audit" && canViewAuditLogs ? (
          <>
            {canPullDrugs ? (
              <Card>
                <div className="inventory-section-header">
                  <h3>Recent Pull Jobs</h3>
                  <span>{jobsSummary.total} tracked</span>
                </div>

                {pullSuccess ? (
                  <div className="inventory-message success">{pullSuccess}</div>
                ) : null}

                {jobsError ? (
                  <div className="inventory-message error">{jobsError}</div>
                ) : jobsLoading ? (
                  <div className="inventory-message">Loading jobs…</div>
                ) : jobs.length === 0 ? (
                  <EmptyState
                    title="No pull jobs"
                    description='Click "Pull Catalog" from the Drug Catalog tab to queue a background sync.'
                  />
                ) : (
                  <div className="inventory-list">
                    {jobs.map((job) => (
                      <div key={job.jobId} className="inventory-list-item">
                        <div>
                          <strong>Job #{job.jobId}</strong>
                          <p>
                            {job.data?.searchTerm || "Full sync"} ·{" "}
                            {job.data?.limit || 0} items
                          </p>
                        </div>
                        <span className={`status-badge status-${job.state}`}>
                          {job.state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ) : null}

            <Card>
              <div className="inventory-section-header">
                <h3>Inventory Audit Log</h3>
                <span>Protected · last 6 events</span>
              </div>

              {auditLogs.length === 0 ? (
                <EmptyState
                  title="No audit events"
                  description="Inventory changes will appear here."
                />
              ) : (
                <div className="inventory-audit-list">
                  {auditLogs.map((entry) => (
                    <div key={entry.id} className="inventory-audit-item">
                      <strong>{entry.summary}</strong>
                      <p>
                        {entry.entityType} · {entry.action}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>

      {/* ── Add / Edit Lot modal ────────────────────────────────────── */}
      {lotModalOpen ? (
        <div className="modal-backdrop" onClick={handleCloseLotModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="inventory-modal-title-group">
                <div className="inventory-modal-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="7" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="12" x2="12" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="9" y1="14.5" x2="15" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3>{lotFormMode === "edit" ? "Edit Lot" : "New Lot"}</h3>
                  <p>
                    {lotFormMode === "edit"
                      ? "Update quantity, expiry date, or minimum threshold."
                      : "Create a new stock lot row for a catalog drug."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseLotModal}
              >
                ×
              </button>
            </div>

            {selectedLot && lotFormMode === "edit" ? (
              <div className="inventory-selected-lot">
                <strong>{selectedLot.drugDisplayName || "Selected lot"}</strong>
                <p>
                  Lot {selectedLot.lotNumber} · NDC{" "}
                  {selectedLot.drug?.productndc || "N/A"}
                </p>
              </div>
            ) : null}

            {lotMessage.text ? (
              <div
                className={`inventory-message ${lotMessage.tone === "error" ? "error" : "success"}`}
              >
                {lotMessage.text}
              </div>
            ) : null}

            <form className="inventory-lot-form" onSubmit={handleLotSubmit}>
              <div className="inventory-lot-section">
                <div className="inventory-lot-section-title">
                  <span className="inventory-lot-step">1</span>
                  Drug
                </div>
                <label>
                  Drug ID
                  <input
                    name="drugId"
                    value={lotForm.drugId}
                    onChange={handleLotFormChange}
                    placeholder="From catalog (click Use for lot)"
                    required
                  />
                  <small className="inventory-lot-hint">
                    Select a drug from the catalog using the "Use for lot" button
                  </small>
                </label>
              </div>

              <div className="inventory-lot-section">
                <div className="inventory-lot-section-title">
                  <span className="inventory-lot-step">2</span>
                  Lot Details
                </div>
                <div className="inventory-lot-2col">
                  <label>
                    Lot Number
                    <input
                      name="lotNumber"
                      value={lotForm.lotNumber}
                      onChange={handleLotFormChange}
                      placeholder="e.g. L2024-001"
                      required
                    />
                  </label>
                  <label>
                    Expiry Date
                    <input
                      name="expiryDate"
                      type="date"
                      value={lotForm.expiryDate}
                      onChange={handleLotFormChange}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="inventory-lot-section">
                <div className="inventory-lot-section-title">
                  <span className="inventory-lot-step">3</span>
                  Quantities
                </div>
                <div className="inventory-lot-2col">
                  <label>
                    Quantity on Hand
                    <input
                      name="quantityOnHand"
                      type="number"
                      min="0"
                      value={lotForm.quantityOnHand}
                      onChange={handleLotFormChange}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Minimum Level
                    <input
                      name="minimumLevel"
                      type="number"
                      min="0"
                      value={lotForm.minimumLevel}
                      onChange={handleLotFormChange}
                      placeholder="0"
                    />
                    <small className="inventory-lot-hint">
                      Alert threshold for low stock
                    </small>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="inventory-secondary-action"
                  onClick={handleCloseLotModal}
                >
                  Cancel
                </button>
                {lotFormMode === "edit" ? (
                  <button
                    type="button"
                    className="inventory-danger-action"
                    disabled={lotSaving || lotDeleting}
                    onClick={handleDeleteLot}
                  >
                    {lotDeleting ? "Deleting…" : "Delete lot"}
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="inventory-primary-action"
                  disabled={lotSaving || lotDeleting}
                >
                  {lotSaving
                    ? "Saving…"
                    : lotFormMode === "edit"
                      ? "Update lot"
                      : "Create lot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Pull Catalog modal ──────────────────────────────────────── */}
      {pullModalOpen ? (
        <div className="modal-backdrop" onClick={() => setPullModalOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Pull Drug Catalog</h3>
                <p>
                  Queue a background job to refresh the catalog from the source
                  feed.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPullModalOpen(false)}
              >
                ×
              </button>
            </div>

            {pullError ? (
              <div className="inventory-message error">{pullError}</div>
            ) : null}

            <form className="inventory-pull-form" onSubmit={handlePullSubmit}>
              <label>
                Search term
                <input
                  type="text"
                  value={pullForm.searchTerm}
                  onChange={(e) =>
                    setPullForm((c) => ({ ...c, searchTerm: e.target.value }))
                  }
                  placeholder="Optional — leave blank for full sync"
                />
              </label>
              <label>
                Limit
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={pullForm.limit}
                  onChange={(e) =>
                    setPullForm((c) => ({ ...c, limit: e.target.value }))
                  }
                />
              </label>
              <div className="modal-footer">
                <button
                  type="button"
                  className="inventory-secondary-action"
                  onClick={() => setPullModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inventory-primary-action"
                  disabled={pullLoading}
                >
                  {pullLoading ? "Queueing…" : "Queue pull job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default InventoryPage;
