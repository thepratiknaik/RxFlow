import React from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import api from "../../services/api.js";
import "./BillingPage.css";

const formatCents = (amount, currency = "usd") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const PLAN_ORDER = ["basic", "pro", "enterprise"];

const STATUS_BADGE = {
  active:    "badge-ready",
  inactive:  "badge-not-sent",
  canceled:  "badge-cancelled",  // Stripe spells it with one L
  cancelled: "badge-cancelled",
  past_due:  "badge-in-process",
  trialing:  "badge-pending",
};

const INVOICE_STATUS_BADGE = {
  paid: "badge-ready",
  open: "badge-in-process",
  void: "badge-expired",
  uncollectible: "badge-cancelled",
  draft: "badge-not-sent",
};

const BillingPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [plans, setPlans] = React.useState([]);
  const [subscription, setSubscription] = React.useState(null);
  const [invoices, setInvoices] = React.useState([]);
  const [loadingPlans, setLoadingPlans] = React.useState(true);
  const [loadingSub, setLoadingSub] = React.useState(true);
  const [loadingInvoices, setLoadingInvoices] = React.useState(true);
  const [checkoutLoading, setCheckoutLoading] = React.useState("");
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [message, setMessage] = React.useState({ tone: "", text: "" });

  // After a successful checkout Stripe can take a few seconds to fire the webhook.
  // Poll until the subscription becomes active (max ~15 s) then stop.
  React.useEffect(() => {
    if (params.get("success") !== "true") return;

    setMessage({ tone: "success", text: "Payment received! Activating your subscription…" });

    let attempts = 0;
    const MAX = 6;
    let timer;

    const poll = async () => {
      attempts++;
      try {
        const res = await api.getBillingSubscription();
        const sub = res?.data;
        const live = sub?.subscriptionStatus === "active" || sub?.subscriptionStatus === "trialing";
        if (live) {
          setSubscription(sub);
          setMessage({ tone: "success", text: `${sub.subscriptionTier ? (sub.subscriptionTier.charAt(0).toUpperCase() + sub.subscriptionTier.slice(1)) : "Subscription"} plan activated successfully.` });
          return;
        }
      } catch {}
      if (attempts < MAX) {
        timer = window.setTimeout(poll, 3000);
      } else {
        setMessage({ tone: "success", text: "Payment received. Refresh the page if your plan hasn't updated yet." });
      }
    };

    timer = window.setTimeout(poll, 2500);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    api
      .getBillingPlans()
      .then((res) => setPlans(res?.data || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));

    api
      .getBillingSubscription()
      .then((res) => setSubscription(res?.data || null))
      .catch(() => {})
      .finally(() => setLoadingSub(false));

    api
      .listBillingInvoices()
      .then((res) => setInvoices(res?.data || []))
      .catch(() => {})
      .finally(() => setLoadingInvoices(false));
  }, []);

  const handleSubscribe = async (planId) => {
    setCheckoutLoading(planId);
    setMessage({ tone: "", text: "" });
    try {
      const origin = window.location.origin;
      const res = await api.createCheckoutSession(
        planId,
        `${origin}/profile?success=true`,
        `${origin}/profile`,
      );
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setMessage({ tone: "error", text: err.message || "Failed to start checkout." });
    } finally {
      setCheckoutLoading("");
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    setMessage({ tone: "", text: "" });
    try {
      const res = await api.createPortalSession();
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setMessage({ tone: "error", text: err.message || "Failed to open billing portal." });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentTier = subscription?.subscriptionTier || "free";
  const currentStatus = subscription?.subscriptionStatus || "inactive";
  const hasActiveSub = currentStatus === "active" || currentStatus === "trialing";

  const sortedPlans = [...plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id),
  );

  return (
    <AppShell title="Billing">
      <div className="billing-page">
        <div className="pg-head">
          {hasActiveSub && (
            <button
              type="button"
              className="billing-portal-btn"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? "Opening…" : "Manage Billing"}
            </button>
          )}
        </div>

        {message.text ? (
          <div className={`page-message${message.tone ? ` ${message.tone}` : ""}`}>
            {message.text}
          </div>
        ) : null}

        {/* Current subscription status */}
        <Card className="billing-status-card">
          <div className="billing-status-row">
            <div className="billing-status-info">
              <p className="page-eyebrow">Current Subscription</p>
              <h2 className="billing-status-name">
                {loadingSub
                  ? "Loading…"
                  : currentTier === "free" || currentTier === "inactive"
                    ? "No active plan"
                    : plans.find((p) => p.id === currentTier)?.name || currentTier}
              </h2>
              {subscription?.currentPeriodEnd && hasActiveSub ? (
                <p className="billing-renews">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              ) : null}
            </div>
            <span className={`badge ${STATUS_BADGE[currentStatus] || "badge-not-sent"}`}>
              {currentStatus}
            </span>
          </div>
        </Card>

        {/* Plan cards */}
        <h3 className="billing-section-title">
          {hasActiveSub ? "Change Plan" : "Choose a Plan"}
        </h3>
        <div className="billing-plans-grid">
          {loadingPlans ? (
            <EmptyState title="Loading plans" description="Fetching available plans…" />
          ) : (
            sortedPlans.map((plan) => {
              const isCurrent = plan.id === currentTier && hasActiveSub;
              return (
                <div
                  key={plan.id}
                  className={`billing-plan-card${isCurrent ? " billing-plan-current" : ""}${plan.id === "pro" ? " billing-plan-featured" : ""}`}
                >
                  {plan.id === "pro" && (
                    <span className="billing-plan-badge">Most Popular</span>
                  )}
                  <div className="billing-plan-header">
                    <h4 className="billing-plan-name">{plan.name}</h4>
                    <p className="billing-plan-desc">{plan.description}</p>
                  </div>
                  <div className="billing-plan-price">
                    <span className="billing-plan-amount">
                      {formatCents(plan.priceMonthly, plan.currency)}
                    </span>
                    <span className="billing-plan-interval"> / month</span>
                  </div>
                  <ul className="billing-plan-features">
                    {(plan.features || []).map((f) => (
                      <li key={f}>
                        <span className="billing-check">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`billing-plan-btn${isCurrent ? " billing-plan-btn-current" : ""}`}
                    onClick={() => !isCurrent && handleSubscribe(plan.id)}
                    disabled={isCurrent || checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id
                      ? "Redirecting…"
                      : isCurrent
                        ? "Current Plan"
                        : hasActiveSub
                          ? "Switch Plan"
                          : "Subscribe"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Invoice history */}
        <h3 className="billing-section-title">Invoice History</h3>
        <Card className="billing-invoices-card">
          {loadingInvoices ? (
            <EmptyState title="Loading invoices" description="Fetching your invoices…" />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Invoices will appear here once you have an active subscription."
            />
          ) : (
            <div className="billing-table-wrap">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Period</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Links</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <span className="billing-invoice-num">{inv.number || inv.id.slice(-8)}</span>
                      </td>
                      <td>
                        {inv.periodStart
                          ? `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`
                          : "—"}
                      </td>
                      <td>
                        <strong>{formatCents(inv.amountDue, inv.currency)}</strong>
                      </td>
                      <td>
                        <span className={`badge ${INVOICE_STATUS_BADGE[inv.status] || "badge-not-sent"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>{formatDate(inv.created)}</td>
                      <td className="billing-invoice-links">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="billing-link"
                          >
                            View
                          </a>
                        ) : null}
                        {inv.invoicePdf ? (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noreferrer"
                            className="billing-link"
                          >
                            PDF
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
};

export default BillingPage;
