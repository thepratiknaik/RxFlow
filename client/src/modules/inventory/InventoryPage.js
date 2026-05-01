import React from "react";
import AppShell from "../../components/AppShell.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "./InventoryPage.css";
import "../dashboard/DashboardPage.css";

const EMPTY_LOT_FORM = {
  drugId: "",
  lotNumber: "",
  expiryDate: "",
  quantityOnHand: "0",
  minimumLevel: "10",
};

const getLotStatus = (lot) => {
  const expiryValue = lot?.expiryDate ? new Date(`${lot.expiryDate}T00:00:00`) : null;
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
  const [traceabilityQuery, setTraceabilityQuery] = React.useState("");
  const [traceabilityLoading, setTraceabilityLoading] = React.useState(false);
  const [traceabilityError, setTraceabilityError] = React.useState("");
  const [traceabilityResult, setTraceabilityResult] = React.useState(null);

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
  const [jobsSummary, setJobsSummary] = React.useState({ total: 0, byState: {} });
  const [jobsLoading, setJobsLoading] = React.useState(false);
  const [jobsError, setJobsError] = React.useState("");

  const [auditLogs, setAuditLogs] = React.useState([]);

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

        return nextLots.some((lot) => lot.id === current) ? current : nextLots[0].id;
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
  }, [canPullDrugs, fetchAuditLogs, fetchDrugs, fetchJobData, latestJobId, searchQuery]);

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

  const handleCreateNewLot = () => {
    setLotFormMode("create");
    setSelectedLotId("");
    setLotMessage({ tone: "", text: "" });
    setLotForm(EMPTY_LOT_FORM);
  };

  const handleEditSelectedLot = (lot) => {
    if (!lot) {
      return;
    }

    setSelectedLotId(lot.id);
    setLotFormMode("edit");
    setLotMessage({ tone: "", text: "" });
    hydrateLotForm(lot);
  };

  const handleLotSubmit = async (event) => {
    event.preventDefault();
    setLotMessage({ tone: "", text: "" });
    setLotSaving(true);

    const payload = {
      drugId: lotForm.drugId.trim(),
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

  const fillDemoLotSuggestions = () => {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryDate = expiry.toISOString().slice(0, 10);
    setLotForm((prev) => ({
      ...prev,
      lotNumber: `LOT-2026-${suffix}`,
      expiryDate: prev.expiryDate || expiryDate,
      quantityOnHand:
        prev.quantityOnHand === "0" || prev.quantityOnHand === ""
          ? "100"
          : prev.quantityOnHand,
      minimumLevel: prev.minimumLevel === "" ? "10" : prev.minimumLevel,
    }));
  };

  const fillTraceabilityFromFirstStockedLot = () => {
    const first = lots[0]?.lotNumber;
    if (first) {
      setTraceabilityQuery(String(first));
      setTraceabilityError("");
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
      await Promise.all([fetchJobData(), fetchAuditLogs()]);
    } catch (err) {
      setPullError(err.message || "Failed to queue drug pull.");
    } finally {
      setPullLoading(false);
    }
  };

  const handleTraceabilitySearch = async (event) => {
    event.preventDefault();
    const query = traceabilityQuery.trim();
    if (!query) {
      setTraceabilityError("Enter a lot number to search.");
      setTraceabilityResult(null);
      return;
    }

    setTraceabilityLoading(true);
    setTraceabilityError("");
    try {
      const response = await api.getLotTraceability(query);
      setTraceabilityResult(response?.data || null);
    } catch (err) {
      setTraceabilityError(err.message || "Failed to load lot traceability.");
      setTraceabilityResult(null);
    } finally {
      setTraceabilityLoading(false);
    }
  };

  const totalVisible = drugs.length;

  return (
    <AppShell title="Inventory">
      <div className="inventory-page inventory-redesign">
        <div className="inventory-top-grid">
          <Card className="inventory-panel inventory-panel-wide inventory-stock-panel">
            <div className="inventory-toolbar">
              <div>
                <h3>Stock lots</h3>
                <p className="inventory-subtitle">
                  Select a lot to edit, or start a new lot record for any drug in
                  the catalog.
                </p>
              </div>
              <div className="inventory-summary">
                <span>{lots.length} visible</span>
                <span className="inventory-alert-pill">
                  {lotsSummary.belowThresholdTotal ?? 0} at risk
                </span>
              </div>
            </div>

            <div className="inventory-lots-toolbar">
              <label className="inventory-lots-toggle">
                <input
                  type="checkbox"
                  checked={lotsFilterLow}
                  onChange={(event) => setLotsFilterLow(event.target.checked)}
                />
                Show only below minimum
              </label>
              {canManageLots ? (
                <button
                  type="button"
                  className="inventory-secondary-action"
                  onClick={handleCreateNewLot}
                >
                  New lot
                </button>
              ) : null}
            </div>

            {lotsError ? <div className="inventory-message error">{lotsError}</div> : null}

            {lotsLoading ? (
              <div className="inventory-message">Loading stock lots...</div>
            ) : lots.length === 0 ? (
              <div className="inventory-empty">
                <EmptyState
                  title="No stock lots"
                  description="Sync or search the catalog, then start receiving stock into lots."
                />
              </div>
            ) : (
              <div className="inventory-table-wrap inventory-lots-table-wrap">
                <table className="inventory-table inventory-lots-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Qty</th>
                      <th>Minimum</th>
                      <th>Lot #</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      {canManageLots ? <th>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => {
                      const lotStatus = getLotStatus(lot);

                      return (
                        <tr
                          key={lot.id}
                          className={`${lot.belowThreshold ? "inventory-row-low" : ""}${
                            selectedLotId === lot.id ? " inventory-row-selected" : ""
                          }`}
                          onClick={() => setSelectedLotId(lot.id)}
                        >
                        <td>
                          <div className="inventory-drug-name">
                            {lot.drugDisplayName || "-"}
                          </div>
                          <div className="inventory-drug-ndc">
                            {lot.drug?.productndc || ""}
                          </div>
                        </td>
                        <td>{lot.quantityOnHand}</td>
                        <td>{lot.minimumLevel}</td>
                        <td className="inventory-mono">{lot.lotNumber}</td>
                        <td>{lot.expiryDate || "-"}</td>
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
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditSelectedLot(lot);
                              }}
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

          <Card className="inventory-panel inventory-lot-editor">
            <div className="inventory-section-header">
              <div>
                <h3>{lotFormMode === "edit" ? "Edit stock lot" : "Add stock lot"}</h3>
                <span>
                  {lotFormMode === "edit"
                    ? "Adjust quantity, lot details, or minimum thresholds."
                    : "Create a new lot row for a catalog drug."}
                </span>
              </div>
              {lotFormMode === "edit" && selectedLot ? (
                <button
                  type="button"
                  className="inventory-secondary-action"
                  onClick={handleCreateNewLot}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            {selectedLot && lotFormMode === "edit" ? (
              <div className="inventory-selected-lot">
                <strong>{selectedLot.drugDisplayName || "Selected lot"}</strong>
                <p>
                  Lot {selectedLot.lotNumber} | NDC {selectedLot.drug?.productndc || "N/A"}
                </p>
              </div>
            ) : null}

            <form className="inventory-lot-form" onSubmit={handleLotSubmit}>
              <label>
                Drug ID
                <input
                  name="drugId"
                  value={lotForm.drugId}
                  onChange={handleLotFormChange}
                  placeholder="Use a catalog item below to prefill this"
                  required
                />
              </label>
              <label>
                Lot number
                <div className="inventory-lot-inline-field">
                  <input
                    name="lotNumber"
                    value={lotForm.lotNumber}
                    onChange={handleLotFormChange}
                    placeholder="e.g. LOT-2026-A1"
                    required
                  />
                  <button
                    type="button"
                    className="inventory-secondary-action"
                    onClick={fillDemoLotSuggestions}
                  >
                    Generate lot #
                  </button>
                </div>
              </label>
              <label>
                Expiry date
                <input
                  name="expiryDate"
                  type="date"
                  value={lotForm.expiryDate}
                  onChange={handleLotFormChange}
                  required
                />
              </label>
              <label>
                Quantity on hand
                <input
                  name="quantityOnHand"
                  type="number"
                  min="0"
                  value={lotForm.quantityOnHand}
                  onChange={handleLotFormChange}
                />
              </label>
              <label>
                Minimum level
                <input
                  name="minimumLevel"
                  type="number"
                  min="0"
                  value={lotForm.minimumLevel}
                  onChange={handleLotFormChange}
                />
              </label>

              <div className="inventory-lot-actions">
                <button type="submit" disabled={lotSaving || lotDeleting}>
                  {lotSaving
                    ? "Saving..."
                    : lotFormMode === "edit"
                      ? "Update lot"
                      : "Create lot"}
                </button>
                {lotFormMode === "edit" ? (
                  <button
                    type="button"
                    className="inventory-danger-action"
                    disabled={lotSaving || lotDeleting}
                    onClick={handleDeleteLot}
                  >
                    {lotDeleting ? "Deleting..." : "Delete lot"}
                  </button>
                ) : null}
              </div>
            </form>

            {lotMessage.text ? (
              <div
                className={`inventory-message ${
                  lotMessage.tone === "error" ? "error" : "success"
                }`}
              >
                {lotMessage.text}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="inventory-grid">
          <Card className="inventory-panel inventory-panel-wide">
            <div className="inventory-toolbar">
              <div>
                <h3>Drug catalog</h3>
                <p className="inventory-subtitle">
                  Search by generic name, brand, or NDC and click any row to use
                  it for a stock lot.
                </p>
              </div>
              <div className="inventory-summary">
                <span>{pagination.total} total drugs</span>
                <span>{totalVisible} on this page</span>
              </div>
            </div>

            <form className="inventory-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search generic name, brand name, or NDC"
              />
              <button type="submit">Search</button>
            </form>

            {error ? <div className="inventory-message error">{error}</div> : null}

            {loading ? (
              <div className="inventory-message">Loading inventory...</div>
            ) : drugs.length === 0 ? (
              <div className="inventory-empty">
                <EmptyState
                  title="No inventory results"
                  description="Try another query or queue a fresh pull from the source feed."
                />
              </div>
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
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drugs.map((drug) => (
                        <tr key={drug.id}>
                          <td>{drug.genericname || "N/A"}</td>
                          <td>{drug.brandname || "N/A"}</td>
                          <td>{drug.productndc || "N/A"}</td>
                          <td>{drug.dosageform || "N/A"}</td>
                          <td>{drug.route || "N/A"}</td>
                          <td>
                            {canManageLots ? (
                              <button
                                type="button"
                                className="inventory-inline-btn"
                                onClick={() => {
                                  setLotFormMode("create");
                                  setSelectedLotId("");
                                  setLotMessage({ tone: "", text: "" });
                                  setLotForm((current) => ({
                                    ...current,
                                    drugId: drug.id,
                                  }));
                                }}
                              >
                                Use for lot
                              </button>
                            ) : (
                              "View"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="inventory-pagination">
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        page: Math.max(current.page - 1, 1),
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
                      setPagination((current) => ({
                        ...current,
                        page: Math.min(current.page + 1, current.totalPages || 1),
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

          <div className="inventory-sidepanels">
            <Card className="inventory-panel">
              <h3>Catalog snapshot</h3>
              <div className="inventory-kpis">
                <div className="inventory-kpi">
                  <span className="inventory-kpi-label">Current page</span>
                  <strong>{pagination.page}</strong>
                </div>
                <div className="inventory-kpi">
                  <span className="inventory-kpi-label">Page size</span>
                  <strong>{pagination.limit}</strong>
                </div>
                <div className="inventory-kpi">
                  <span className="inventory-kpi-label">Total records</span>
                  <strong>{pagination.total}</strong>
                </div>
              </div>
            </Card>

            {canPullDrugs ? (
              <>
                <Card className="inventory-panel">
                  <h3>Pull drug catalog</h3>
                  <p className="inventory-subtitle">
                    Queue a background job to refresh the drug catalog from the
                    source feed.
                  </p>

                  <form className="inventory-pull-form" onSubmit={handlePullSubmit}>
                    <label>
                      Search term
                      <input
                        type="text"
                        value={pullForm.searchTerm}
                        onChange={(event) =>
                          setPullForm((current) => ({
                            ...current,
                            searchTerm: event.target.value,
                          }))
                        }
                        placeholder="Optional source filter"
                      />
                    </label>
                    <label>
                      Limit
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pullForm.limit}
                        onChange={(event) =>
                          setPullForm((current) => ({
                            ...current,
                            limit: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button type="submit" disabled={pullLoading}>
                      {pullLoading ? "Queueing..." : "Queue pull job"}
                    </button>
                  </form>

                  {pullError ? <div className="inventory-message error">{pullError}</div> : null}
                  {pullSuccess ? (
                    <div className="inventory-message success">{pullSuccess}</div>
                  ) : null}
                </Card>

                <Card className="inventory-panel">
                  <h3>Lot traceability</h3>
                  <p className="inventory-subtitle">
                    Search a lot number to trace stocked inventory and dispensed
                    prescriptions for recall investigations.
                  </p>
                  <form
                    className="inventory-pull-form"
                    onSubmit={handleTraceabilitySearch}
                  >
                    <div className="inventory-trace-inline">
                      <label>
                        Lot number
                        <input
                          type="text"
                          value={traceabilityQuery}
                          onChange={(event) => setTraceabilityQuery(event.target.value)}
                          placeholder="e.g. LOT-2026-A1"
                        />
                      </label>
                      <button
                        type="button"
                        className="inventory-secondary-action"
                        disabled={!lots.length}
                        onClick={fillTraceabilityFromFirstStockedLot}
                        title={
                          lots[0]?.lotNumber
                            ? `Use ${lots[0].lotNumber}`
                            : "Add or load stock lots first"
                        }
                      >
                        Use first stocked lot
                      </button>
                      <button type="submit" disabled={traceabilityLoading}>
                        {traceabilityLoading ? "Searching..." : "Trace lot"}
                      </button>
                    </div>
                  </form>
                  {traceabilityError ? (
                    <div className="inventory-message error">{traceabilityError}</div>
                  ) : null}
                  {traceabilityResult ? (
                    <div className="inventory-audit-list">
                      <div className="inventory-audit-item">
                        <strong>Stocked lots</strong>
                        <p>
                          {traceabilityResult.stockedLots?.length || 0} record(s)
                          matched
                        </p>
                      </div>
                      <div className="inventory-audit-item">
                        <strong>Dispensed prescriptions</strong>
                        <p>
                          {traceabilityResult.dispensedPrescriptions?.length || 0}{" "}
                          dispense event(s) matched
                        </p>
                      </div>
                    </div>
                  ) : null}
                </Card>

                <Card className="inventory-panel">
                  <div className="inventory-section-header">
                    <h3>Recent pull jobs</h3>
                    <span>{jobsSummary.total} tracked</span>
                  </div>

                  {jobsError ? (
                    <div className="inventory-message error">{jobsError}</div>
                  ) : jobsLoading ? (
                    <div className="inventory-message">Loading jobs...</div>
                  ) : jobs.length === 0 ? (
                    <div className="inventory-message">No pull jobs found.</div>
                  ) : (
                    <div className="inventory-list">
                      {jobs.map((job) => (
                        <div key={job.jobId} className="inventory-list-item">
                          <div>
                            <strong>Job #{job.jobId}</strong>
                            <p>
                              {job.data?.searchTerm || "Full sync"} | {job.data?.limit || 0} items
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

                <Card className="inventory-panel">
                  <div className="inventory-section-header">
                    <h3>Inventory audit feed</h3>
                    <span>Protected</span>
                  </div>

                  {!auditLogs.length ? (
                    <div className="inventory-message">
                      No recent inventory audit events.
                    </div>
                  ) : (
                    <div className="inventory-audit-list">
                      {auditLogs.map((entry) => (
                        <div key={entry.id} className="inventory-audit-item">
                          <strong>{entry.summary}</strong>
                          <p>
                            {entry.entityType} | {entry.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card className="inventory-panel">
                <EmptyState
                  title="Read-only inventory access"
                  description="Your role can browse inventory, but only pharmacists and admins can manage lots and queue pull jobs."
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default InventoryPage;
