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

  const [audits, setAudits] = React.useState([]);
  const [auditsLoading, setAuditsLoading] = React.useState(false);
  const [auditsError, setAuditsError] = React.useState("");

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
    setAuditsLoading(true);
    setAuditsError("");

    try {
      const [jobsResponse, auditsResponse] = await Promise.all([
        api.listDrugPullJobs({ limit: 5 }),
        api.listDrugPullAudits({ page: 1, limit: 5 }),
      ]);

      setJobs(jobsResponse?.data || []);
      setJobsSummary(jobsResponse?.summary || { total: 0, byState: {} });
      setAudits(auditsResponse?.data || []);
    } catch (err) {
      const message = err.message || "Failed to load pull activity.";
      setJobsError(message);
      setAuditsError(message);
    } finally {
      setJobsLoading(false);
      setAuditsLoading(false);
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

                <Card className="inventory-panel">
                  <h3>Recent Pull Audits</h3>

                  {auditsError ? (
                    <div className="inventory-message error">{auditsError}</div>
                  ) : auditsLoading ? (
                    <div className="inventory-message">Loading audits...</div>
                  ) : audits.length === 0 ? (
                    <div className="inventory-message">No pull audits found.</div>
                  ) : (
                    <div className="inventory-list">
                      {audits.map((audit) => (
                        <div key={audit.id} className="inventory-list-item audit-item">
                          <div>
                            <strong>{audit.searchterm || "Full sync"}</strong>
                            <p>
                              Requested {audit.requestedlimit} items
                            </p>
                          </div>
                          <span className={`status-badge status-${audit.status}`}>
                            {audit.status}
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
