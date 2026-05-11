import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import api from "../../services/api.js";
import { formatPhone } from "../../utils/formatters.js";
import "./DashboardPage.css";

const formatDateTime = (value) => {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
};

const DashboardPage = () => {
  const [summary, setSummary] = React.useState({
    prescriptions: [],
    lots: [],
    lotSummary: { belowThresholdTotal: 0, totalLotRows: 0 },
    patients: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [prescriptionsResponse, lotsResponse, patientsResponse] =
        await Promise.all([
          api.listPrescriptions({ page: 1, limit: 200 }),
          api.listInventoryLots({ page: 1, limit: 50, belowThreshold: false }),
          api.searchPatients({ page: 1, limit: 8, q: "" }),
        ]);

      setSummary({
        prescriptions: prescriptionsResponse?.data || [],
        lots: lotsResponse?.data || [],
        lotSummary: lotsResponse?.summary || {
          belowThresholdTotal: 0,
          totalLotRows: 0,
        },
        patients: patientsResponse?.data || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const counts = summary.prescriptions.reduce(
    (acc, item) => {
      const status = String(item?.status || "").toLowerCase();
      acc.total += 1;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { total: 0, new: 0, in_process: 0, ready: 0, cancelled: 0 },
  );

  const recentQueue = summary.prescriptions.slice(0, 6);
  const lowLots = summary.lots.filter((lot) => lot?.belowThreshold).slice(0, 5);

  return (
    <AppShell title="Dashboard">
      <div className="dashboard-page">
        {error ? <div className="dashboard-message error">{error}</div> : null}
        {loading ? (
          <div className="dashboard-message">Loading dashboard...</div>
        ) : null}

        {!loading ? (
          <>
            <section className="dashboard-stat-grid">
              <Card className="dashboard-stat-card accent-prescriptions">
                <span className="dashboard-stat-label">New prescriptions</span>
                <strong>{counts.new || 0}</strong>
                <p>Items waiting for intake and review routing.</p>
              </Card>
              <Card className="dashboard-stat-card accent-processing">
                <span className="dashboard-stat-label">In process</span>
                <strong>{counts.in_process || 0}</strong>
                <p>Prescriptions currently moving through fulfillment.</p>
              </Card>
              <Card className="dashboard-stat-card accent-ready">
                <span className="dashboard-stat-label">Ready for pickup</span>
                <strong>{counts.ready || 0}</strong>
                <p>Completed prescriptions ready for patient handoff.</p>
              </Card>
              <Card className="dashboard-stat-card accent-risk">
                <span className="dashboard-stat-label">Low stock lots</span>
                <strong>{summary.lotSummary?.belowThresholdTotal || 0}</strong>
                <p>Lot rows currently below configured minimum quantity.</p>
              </Card>
            </section>

            <div className="dashboard-main-grid">
              <Card className="dashboard-panel dashboard-panel-large">
                <div className="dashboard-panel-header">
                  <div>
                    <p className="dashboard-eyebrow">Prescription flow</p>
                    <h3>Queue focus</h3>
                  </div>
                  <span>{counts.total || 0} tracked</span>
                </div>

                {!recentQueue.length ? (
                  <EmptyState
                    title="No prescriptions yet"
                    description="Prescription activity will populate here once records are created."
                  />
                ) : (
                  <div className="dashboard-queue-list">
                    {recentQueue.map((item) => (
                      <div key={item.id} className="dashboard-queue-item">
                        <div>
                          <strong>
                            {item?.medicationDisplay || "Medication"}
                          </strong>
                          <p>
                            {item?.patient?.firstName || "Unknown"}{" "}
                            {item?.patient?.lastName || "Patient"}
                          </p>
                        </div>
                        <div className="dashboard-queue-meta">
                          <span
                            className={`dashboard-pill status-${String(
                              item?.status || "new",
                            ).replace(/_/g, "-")}`}
                          >
                            {String(item?.status || "new").replace(/_/g, " ")}
                          </span>
                          <em>
                            {formatDateTime(
                              item?.created_at || item?.createdat,
                            )}
                          </em>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="dashboard-panel">
                <div className="dashboard-panel-header">
                  <div>
                    <p className="dashboard-eyebrow">Inventory risk</p>
                    <h3>Low-stock watchlist</h3>
                  </div>
                  <span>{lowLots.length} shown</span>
                </div>

                {!lowLots.length ? (
                  <EmptyState
                    title="No low-stock alerts"
                    description="All visible stock lots are currently above their minimum levels."
                  />
                ) : (
                  <div className="dashboard-alert-list">
                    {lowLots.map((lot) => (
                      <div key={lot.id} className="dashboard-alert-item">
                        <strong>
                          {lot.drugDisplayName || "Inventory item"}
                        </strong>
                        <p>
                          Lot {lot.lotNumber} | {lot.quantityOnHand} on hand /
                          min {lot.minimumLevel}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <p className="dashboard-eyebrow">Patients</p>
                  <h3>Recent patient records</h3>
                </div>
                <span>{summary.patients.length} visible</span>
              </div>

              {!summary.patients.length ? (
                <EmptyState
                  title="No patient records"
                  description="Patient records will appear here as soon as the directory has entries."
                />
              ) : (
                <div className="dashboard-patient-list">
                  {summary.patients.map((patient) => (
                    <div key={patient.id} className="dashboard-patient-item">
                      <strong>
                        {patient.firstName} {patient.lastName}
                      </strong>
                      <p>
                        {patient.patientNumber} |{" "}
                        {patient.phonePrimary ? formatPhone(patient.phonePrimary) : "No phone"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
};

export default DashboardPage;
