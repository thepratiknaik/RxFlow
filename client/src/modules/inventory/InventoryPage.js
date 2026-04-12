import React from "react";
import AppShell from "../../components/AppShell.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "./InventoryPage.css";
import "../dashboard/DashboardPage.css";

const InventoryPage = () => {
  const { user } = useAuth();
  const canPullDrugs = ["admin", "pharmacist"].includes(
    String(user?.role || "").toLowerCase(),
  );
  const canManageLots = canPullDrugs;

  const [lots, setLots] = React.useState([]);
  const [lotsSummary, setLotsSummary] = React.useState({
    belowThresholdTotal: 0,
    totalLotRows: 0,
  });
  const [lotsLoading, setLotsLoading] = React.useState(true);
  const [lotsError, setLotsError] = React.useState("");
  const [lotsFilterLow, setLotsFilterLow] = React.useState(false);
  const [lotForm, setLotForm] = React.useState({
    drugId: "",
    lotNumber: "",
    expiryDate: "",
    quantityOnHand: "0",
    minimumLevel: "10",
  });
  const [lotSaving, setLotSaving] = React.useState(false);
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
  const [jobsSummary, setJobsSummary] = React.useState({ total: 0, byState: {} });
  const [jobsLoading, setJobsLoading] = React.useState(false);
  const [jobsError, setJobsError] = React.useState("");

  const fetchLots = React.useCallback(async () => {
    setLotsLoading(true);
    setLotsError("");

    try {
      const response = await api.listInventoryLots({
        page: 1,
        limit: 200,
        belowThreshold: lotsFilterLow,
      });

      setLots(response?.data || []);
      setLotsSummary(
        response?.summary || { belowThresholdTotal: 0, totalLotRows: 0 },
      );
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

  React.useEffect(() => {
    fetchDrugs(pagination.page, searchQuery);
  }, [fetchDrugs, pagination.page, searchQuery]);

  React.useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  React.useEffect(() => {
    if (!latestJobId || !canPullDrugs) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const response = await api.getDrugPullJob(latestJobId);
        const state = response?.data?.state;

        if (state && !["waiting", "active", "delayed"].includes(state)) {
          fetchJobData();
          fetchDrugs(1, searchQuery);
          setLatestJobId("");
        } else {
          fetchJobData();
        }
      } catch {
        setLatestJobId("");
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [canPullDrugs, fetchDrugs, fetchJobData, latestJobId, searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextQuery = searchInput.trim();

    if (pagination.page === 1 && nextQuery === searchQuery) {
      fetchDrugs(1, nextQuery);
      return;
    }

    setPagination((current) => ({ ...current, page: 1 }));
    setSearchQuery(nextQuery);
  };

  const handleLotFormChange = (e) => {
    const { name, value } = e.target;
    setLotForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLotSubmit = async (e) => {
    e.preventDefault();
    setLotMessage({ tone: "", text: "" });
    setLotSaving(true);

    try {
      await api.createInventoryLot({
        drugId: lotForm.drugId.trim(),
        lotNumber: lotForm.lotNumber.trim(),
        expiryDate: lotForm.expiryDate,
        quantityOnHand: Number(lotForm.quantityOnHand) || 0,
        minimumLevel: Number(lotForm.minimumLevel) || 10,
      });
      setLotMessage({ tone: "success", text: "Stock lot saved." });
      setLotForm({
        drugId: "",
        lotNumber: "",
        expiryDate: "",
        quantityOnHand: "0",
        minimumLevel: "10",
      });
      await fetchLots();
    } catch (err) {
      setLotMessage({
        tone: "error",
        text: err.message || "Could not save stock lot.",
      });
    } finally {
      setLotSaving(false);
    }
  };

  const handlePullSubmit = async (e) => {
    e.preventDefault();
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
      await fetchJobData();
    } catch (err) {
      setPullError(err.message || "Failed to queue drug pull.");
    } finally {
      setPullLoading(false);
    }
  };

  const totalVisible = drugs.length;

  return (
    <AppShell title="Inventory">
      <div className="inventory-page">
        <Card className="inventory-panel inventory-stock-dashboard">
          <div className="inventory-toolbar">
            <div>
              <h3>Stock by lot</h3>
              <p className="inventory-subtitle">
                On-hand quantity, lot number, and expiry. Rows highlight when{" "}
                <strong>quantity &lt; minimum level</strong> (backend threshold
                rule).
              </p>
            </div>
            <div className="inventory-summary">
              <span>{lotsSummary.totalLotRows ?? 0} lot rows</span>
              <span className="inventory-alert-pill">
                {lotsSummary.belowThresholdTotal ?? 0} below minimum
              </span>
            </div>
          </div>

          <div className="inventory-lots-toolbar">
            <label className="inventory-lots-toggle">
              <input
                type="checkbox"
                checked={lotsFilterLow}
                onChange={(e) => setLotsFilterLow(e.target.checked)}
              />
              Show only below minimum
            </label>
          </div>

          {lotsError ? (
            <div className="inventory-message error">{lotsError}</div>
          ) : null}

          {lotsLoading ? (
            <div className="inventory-message">Loading stock lots…</div>
          ) : lots.length === 0 ? (
            <div className="inventory-empty">
              <EmptyState
                title="No stock lots"
                description="Add lots against drugs from your catalog, or sync drugs first then record receiving."
              />
            </div>
          ) : (
            <div className="inventory-table-wrap inventory-lots-table-wrap">
              <table className="inventory-table inventory-lots-table">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Quantity</th>
                    <th>Minimum</th>
                    <th>Lot #</th>
                    <th>Expiry</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr
                      key={lot.id}
                      className={
                        lot.belowThreshold ? "inventory-row-low" : undefined
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
                        {lot.belowThreshold ? (
                          <span className="inventory-status-badge inventory-status-low">
                            Low stock
                          </span>
                        ) : (
                          <span className="inventory-status-badge inventory-status-ok">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManageLots ? (
            <div className="inventory-lot-form-wrap">
              <h4 className="inventory-lot-form-title">Add / adjust lot</h4>
              <form className="inventory-lot-form" onSubmit={handleLotSubmit}>
                <label>
                  Drug ID (UUID)
                  <input
                    name="drugId"
                    value={lotForm.drugId}
                    onChange={handleLotFormChange}
                    placeholder="From drug catalog"
                    required
                  />
                </label>
                <label>
                  Lot number
                  <input
                    name="lotNumber"
                    value={lotForm.lotNumber}
                    onChange={handleLotFormChange}
                    required
                  />
                </label>
                <label>
                  Expiry
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
                <button type="submit" disabled={lotSaving}>
                  {lotSaving ? "Saving…" : "Save lot"}
                </button>
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
            </div>
          ) : null}
        </Card>

        <div className="inventory-grid">
          <Card className="inventory-panel inventory-panel-wide">
            <div className="inventory-toolbar">
              <div>
                <h3>Drug Inventory</h3>
                <p className="inventory-subtitle">
                  Search the synced drug catalog by generic name, brand name, or NDC.
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
                onChange={(e) => setSearchInput(e.target.value)}
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
                  description="Try a different search term or run a new drug pull if the catalog has not been synced yet."
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
                        <th>Labeler</th>
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
                          <td>{drug.labelername || "N/A"}</td>
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
              <h3>Catalog Snapshot</h3>
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
                  <h3>Pull Drug Catalog</h3>
                  <p className="inventory-subtitle">
                    Queue a background job to refresh the drug catalog from the source feed.
                  </p>

                  <form className="inventory-pull-form" onSubmit={handlePullSubmit}>
                    <label>
                      Search Term
                      <input
                        type="text"
                        value={pullForm.searchTerm}
                        onChange={(e) =>
                          setPullForm((current) => ({
                            ...current,
                            searchTerm: e.target.value,
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
                        onChange={(e) =>
                          setPullForm((current) => ({
                            ...current,
                            limit: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <button type="submit" disabled={pullLoading}>
                      {pullLoading ? "Queueing..." : "Queue Pull Job"}
                    </button>
                  </form>

                  {pullError ? (
                    <div className="inventory-message error">{pullError}</div>
                  ) : null}
                  {pullSuccess ? (
                    <div className="inventory-message success">{pullSuccess}</div>
                  ) : null}
                </Card>

                <Card className="inventory-panel">
                  <div className="inventory-section-header">
                    <h3>Recent Pull Jobs</h3>
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

              </>
            ) : (
              <Card className="inventory-panel">
                <EmptyState
                  title="Read-only inventory access"
                  description="Your role can browse the current drug catalog, but only pharmacists and admins can queue a catalog pull."
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
