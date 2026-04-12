import React, { useCallback, useEffect, useState } from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import api, { ApiError } from "../../services/api.js";
import "./PrescriptionsPage.css";
import "../dashboard/DashboardPage.css";

const formatTs = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
};

const formatDateOnly = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return String(value).slice(0, 10);
  } catch {
    return String(value);
  }
};

const EMPTY_MANUAL = {
  patientId: "",
  medicationDisplay: "",
  sig: "",
  quantityValue: "",
  quantityUnit: "",
  refillsAllowed: "",
  authoredOn: "",
  prescriberDisplay: "",
  notes: "",
  insuranceProviderName: "",
  insurancePolicyNumber: "",
  insuranceGroupId: "",
};

const PrescriptionsPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState({ tone: "idle", text: "" });
  const [syncing, setSyncing] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState("");

  const canSyncFhir =
    user?.role === "pharmacist" || user?.role === "admin";

  const isPharmacist = user?.role === "pharmacist";

  const loadNewQueue = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const res = await api.listPrescriptions({
        status: "new",
        page: 1,
        limit: 100,
      });
      setItems(res?.data || []);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "Unable to load the New prescription queue.";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNewQueue();
  }, [loadNewQueue]);

  const handleSyncFhir = async () => {
    setBanner({ tone: "idle", text: "" });
    setSyncing(true);

    try {
      const res = await api.syncFhirPrescriptions({ maxCount: 25 });
      const d = res?.data;
      setBanner({
        tone: "success",
        text: `Synced FHIR inbox: ${d?.created ?? 0} new, ${d?.updated ?? 0} updated, ${d?.skipped ?? 0} skipped.`,
      });
      await loadNewQueue();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : "FHIR sync failed. Check that the API can reach the FHIR server.";
      setBanner({ tone: "error", text: msg });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManual((prev) => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!manual.medicationDisplay.trim()) {
      setError("Medication is required for manual entry.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        medicationDisplay: manual.medicationDisplay.trim(),
        sig: manual.sig.trim() || undefined,
        quantityValue: manual.quantityValue.trim() || undefined,
        quantityUnit: manual.quantityUnit.trim() || undefined,
        refillsAllowed: manual.refillsAllowed.trim() || undefined,
        authoredOn: manual.authoredOn.trim() || undefined,
        prescriberDisplay: manual.prescriberDisplay.trim() || undefined,
        notes: manual.notes.trim() || undefined,
      };

      if (manual.patientId.trim()) {
        payload.patientId = manual.patientId.trim();
      }

      if (manual.insuranceProviderName.trim()) {
        payload.insuranceProviderName = manual.insuranceProviderName.trim();
      }
      if (manual.insurancePolicyNumber.trim()) {
        payload.insurancePolicyNumber = manual.insurancePolicyNumber.trim();
      }
      if (manual.insuranceGroupId.trim()) {
        payload.insuranceGroupId = manual.insuranceGroupId.trim();
      }

      await api.createPrescription(payload);
      setManual(EMPTY_MANUAL);
      await loadNewQueue();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not create prescription.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveEtIn = async (id) => {
    setError("");
    setApprovingId(id);

    try {
      await api.approvePrescriptionEtIn(id);
      await loadNewQueue();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not record ET-In approval.";
      setError(msg);
    } finally {
      setApprovingId("");
    }
  };

  const insuranceSummary = (row) => {
    const parts = [
      row.insuranceProviderName,
      row.insurancePolicyNumber,
      row.insuranceGroupId,
    ].filter(Boolean);

    return parts.length ? parts.join(" · ") : "—";
  };

  return (
    <AppShell title="Prescriptions">
      <div className="prescriptions-layout">
        {banner.text ? (
          <div
            className={`prescriptions-banner ${
              banner.tone === "error"
                ? "prescriptions-banner--warn"
                : "prescriptions-banner--ok"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <Card>
          <div className="prescriptions-toolbar">
            <div>
              <h3 className="prescriptions-section-title">New queue</h3>
              <p className="prescriptions-section-desc">
                Prescriptions in <strong>New</strong> status, newest received
                first (sorted by intake time). A pharmacist must record{" "}
                <strong>ET-In approval</strong> before dispensing workflow
                continues.
              </p>
            </div>
            {canSyncFhir ? (
              <button
                type="button"
                className="btn-primary prescriptions-sync-btn"
                onClick={handleSyncFhir}
                disabled={syncing}
              >
                {syncing ? "Syncing eRx…" : "Sync eRx inbox (FHIR)"}
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="prescriptions-muted">Loading queue…</p>
          ) : error ? (
            <p className="prescriptions-error">{error}</p>
          ) : items.length === 0 ? (
            <EmptyState
              title="No prescriptions in New"
              description="Sync from the FHIR eRx inbox or add a prescription manually below."
            />
          ) : (
            <div className="prescriptions-table-wrap">
              <table className="prescriptions-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Rx #</th>
                    <th>Medication</th>
                    <th>Patient</th>
                    <th>Source</th>
                    <th>Authored</th>
                    <th>Insurance</th>
                    <th>ET-In</th>
                    <th>Sig</th>
                    {isPharmacist ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{formatTs(row.createdat)}</td>
                      <td className="prescriptions-mono">
                        {row.prescriptionNumber}
                      </td>
                      <td>{row.medicationDisplay}</td>
                      <td>
                        {row.patient
                          ? `${row.patient.firstName} ${row.patient.lastName} (${row.patient.patientNumber})`
                          : row.externalSubjectRef || "—"}
                      </td>
                      <td>
                        <span
                          className={`prescriptions-pill prescriptions-pill--${row.source}`}
                        >
                          {row.source === "fhir" ? "eRx / FHIR" : "Manual"}
                        </span>
                      </td>
                      <td>{formatDateOnly(row.authoredOn)}</td>
                      <td className="prescriptions-insurance">
                        {insuranceSummary(row)}
                      </td>
                      <td>
                        {row.etInApproved ? (
                          <span className="prescriptions-etin prescriptions-etin--ok">
                            Approved
                          </span>
                        ) : (
                          <span className="prescriptions-etin prescriptions-etin--pending">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="prescriptions-sig">
                        {row.sig || "—"}
                      </td>
                      {isPharmacist ? (
                        <td>
                          {!row.etInApproved ? (
                            <button
                              type="button"
                              className="btn-primary prescriptions-approve-btn"
                              disabled={approvingId === row.id}
                              onClick={() => handleApproveEtIn(row.id)}
                            >
                              {approvingId === row.id
                                ? "…"
                                : "Approve ET-In"}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="prescriptions-section-title">Manual entry</h3>
          <p className="prescriptions-section-desc">
            Enter a prescription received outside the eRx inbox. It is placed
            into the <strong>New</strong> queue; a pharmacist records ET-In
            approval before fill.
          </p>

          <form className="prescriptions-manual-form" onSubmit={handleManualSubmit}>
            <label>
              Medication *
              <input
                name="medicationDisplay"
                value={manual.medicationDisplay}
                onChange={handleManualChange}
                placeholder="e.g. Amoxicillin 500 mg capsule"
                required
              />
            </label>
            <label>
              Sig
              <textarea
                name="sig"
                value={manual.sig}
                onChange={handleManualChange}
                rows={2}
                placeholder="Directions to patient"
              />
            </label>
            <div className="prescriptions-insurance-block">
              <h4 className="prescriptions-subheading">Insurance</h4>
              <div className="prescriptions-manual-grid">
                <label>
                  Provider name
                  <input
                    name="insuranceProviderName"
                    value={manual.insuranceProviderName}
                    onChange={handleManualChange}
                    placeholder="Payer / plan name"
                  />
                </label>
                <label>
                  Policy number
                  <input
                    name="insurancePolicyNumber"
                    value={manual.insurancePolicyNumber}
                    onChange={handleManualChange}
                    placeholder="Member or policy ID"
                  />
                </label>
                <label>
                  Group ID
                  <input
                    name="insuranceGroupId"
                    value={manual.insuranceGroupId}
                    onChange={handleManualChange}
                    placeholder="Group or bin / PCN as applicable"
                  />
                </label>
              </div>
            </div>

            <div className="prescriptions-manual-grid">
              <label>
                Patient ID (optional)
                <input
                  name="patientId"
                  value={manual.patientId}
                  onChange={handleManualChange}
                  placeholder="UUID from Patients"
                />
              </label>
              <label>
                Qty
                <input
                  name="quantityValue"
                  value={manual.quantityValue}
                  onChange={handleManualChange}
                  placeholder="30"
                />
              </label>
              <label>
                Unit
                <input
                  name="quantityUnit"
                  value={manual.quantityUnit}
                  onChange={handleManualChange}
                  placeholder="tablet"
                />
              </label>
              <label>
                Refills
                <input
                  name="refillsAllowed"
                  value={manual.refillsAllowed}
                  onChange={handleManualChange}
                  placeholder="0"
                />
              </label>
              <label>
                Authored on
                <input
                  name="authoredOn"
                  type="date"
                  value={manual.authoredOn}
                  onChange={handleManualChange}
                />
              </label>
              <label>
                Prescriber
                <input
                  name="prescriberDisplay"
                  value={manual.prescriberDisplay}
                  onChange={handleManualChange}
                  placeholder="Dr. Name or clinic"
                />
              </label>
            </div>
            <label>
              Notes
              <textarea
                name="notes"
                value={manual.notes}
                onChange={handleManualChange}
                rows={2}
              />
            </label>
            <div className="prescriptions-form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Add to New queue"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
};

export default PrescriptionsPage;
