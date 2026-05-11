import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import AppShell from "../../components/AppShell.js";
import api from "../../services/api.js";
import { ROUTES } from "../../config/routes.js";
import "./ProfilePage.css";

const PLAN_DISPLAY = {
  basic:      { name: "Basic",        price: "$49 / month" },
  pro:        { name: "Professional", price: "$99 / month" },
  enterprise: { name: "Enterprise",   price: "$199 / month" },
  free:       { name: "Free",         price: "—"            },
};

const SUB_STATUS_BADGE = {
  active:    "badge-ready",
  trialing:  "badge-pending",
  past_due:  "badge-in-process",
  canceled:  "badge-cancelled",  // Stripe spells it with one L
  cancelled: "badge-cancelled",
  inactive:  "badge-not-sent",
};

const formatDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
};

const formatDateShort = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const formatCents = (amount, currency = "usd") => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const INVOICE_STATUS_BADGE = {
  paid: "badge-ready",
  open: "badge-in-process",
  void: "badge-expired",
  uncollectible: "badge-cancelled",
  draft: "badge-not-sent",
};

const ROLE_COLORS = {
  admin: { bg: "#dbeafe", color: "#1d4ed8" },
  pharmacist: { bg: "#dcfce7", color: "#15803d" },
  technician: { bg: "#fef3c7", color: "#b45309" },
};

const RoleBadge = ({ role }) => {
  const key = String(role || "").toLowerCase();
  const style = ROLE_COLORS[key] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span className="pf-role-badge" style={{ background: style.bg, color: style.color }}>
      {role || "Member"}
    </span>
  );
};

const Feedback = ({ type, message, onClose }) => {
  if (!message) return null;
  return (
    <div className={`pf-feedback pf-feedback--${type}`} role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" className="pf-feedback-close" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
};

const SectionHeader = ({ title, description, action }) => (
  <div className="pf-section-header">
    <div>
      <h3 className="pf-section-title">{title}</h3>
      {description && <p className="pf-section-desc">{description}</p>}
    </div>
    {action}
  </div>
);

const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const location = useLocation();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  // ── UI state ────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");

  // ── Loading states ───────────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [pharmacySaveLoading, setPharmacySaveLoading] = useState(false);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);

  // ── Feedback ─────────────────────────────────────────────────────
  const [profileMsg, setProfileMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [pharmacyMsg, setPharmacyMsg] = useState(null);

  // ── Form state ───────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pharmacyForm, setPharmacyForm] = useState({ name: "", licenseNumber: "" });
  const [pharmacyDetails, setPharmacyDetails] = useState(null);

  // ── Billing state (lazy-loaded on tab open) ──────────────────────
  const billingFetched = useRef(false);
  const [subscription, setSubscription] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // ── Pharmacy load ────────────────────────────────────────────────
  useEffect(() => {
    const loadPharmacy = async () => {
      try {
        setPharmacyLoading(true);
        const response = await api.getPharmacy();
        if (response?.data) {
          setPharmacyDetails(response.data);
          setPharmacyForm({
            name: response.data.name || "",
            licenseNumber: response.data.licenseNumber || "",
          });
        }
      } catch {
        // pharmacy may not exist yet
      } finally {
        setPharmacyLoading(false);
      }
    };
    loadPharmacy();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileLoading(true);
    try {
      await updateProfile(profileForm);
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message || "Update failed." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword(passwordForm);
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.message || "Password change failed." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePharmacySubmit = async (e) => {
    e.preventDefault();
    setPharmacyMsg(null);
    setPharmacySaveLoading(true);
    try {
      const response = await api.updatePharmacy(pharmacyForm);
      if (response?.data) setPharmacyDetails(response.data);
      setPharmacyMsg({ type: "success", text: "Pharmacy details updated." });
    } catch (err) {
      setPharmacyMsg({ type: "error", text: err.message || "Update failed." });
    } finally {
      setPharmacySaveLoading(false);
    }
  };

  const fetchBilling = async () => {
    setBillingLoading(true);
    try {
      const res = await api.getBillingSubscription();
      setSubscription(res?.data || null);
    } catch (err) {
      setBillingMsg({ type: "error", text: err.message || "Failed to load subscription." });
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await api.listBillingInvoices();
      setInvoices(res?.data || []);
    } catch {
      // silently fail — invoices section just stays empty
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleBillingTabOpen = () => {
    setActiveSection("billing");
    if (!billingFetched.current) {
      billingFetched.current = true;
      fetchBilling();
      fetchInvoices();
    }
  };

  // Poll for subscription activation after Stripe checkout redirect (?success=true)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("success") !== "true" || !isAdmin) return;

    setActiveSection("billing");
    billingFetched.current = true;
    setBillingMsg({ type: "success", text: "Payment received! Activating your subscription…" });

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
          const tierName = sub.subscriptionTier
            ? sub.subscriptionTier.charAt(0).toUpperCase() + sub.subscriptionTier.slice(1)
            : "Subscription";
          setBillingMsg({ type: "success", text: `${tierName} plan activated successfully.` });
          fetchInvoices();
          return;
        }
      } catch {}
      if (attempts < MAX) {
        timer = window.setTimeout(poll, 3000);
      } else {
        setBillingMsg({ type: "success", text: "Payment received. Refresh if your plan hasn't updated yet." });
      }
    };

    fetchBilling();
    fetchInvoices();
    timer = window.setTimeout(poll, 2500);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePortal = async () => {
    setBillingPortalLoading(true);
    setBillingMsg(null);
    try {
      const res = await api.createPortalSession();
      if (res?.data?.url) window.location.href = res.data.url;
    } catch (err) {
      setBillingMsg({ type: "error", text: err.message || "Failed to open billing portal." });
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const initials = (user?.fullname || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const NAV_ITEMS = [
    { id: "profile",  label: "Personal Info", onClick: () => setActiveSection("profile")  },
    { id: "security", label: "Security",      onClick: () => setActiveSection("security") },
    ...(isAdmin ? [
      { id: "pharmacy", label: "Pharmacy", onClick: () => setActiveSection("pharmacy") },
      { id: "billing",  label: "Billing",  onClick: handleBillingTabOpen                },
    ] : []),
  ];

  return (
    <AppShell title="Profile">
      <div className="pf-page">

        {/* ── Banner ─────────────────────────────────────────────── */}
        <div className="pf-banner">
          <div className="pf-banner-bg" aria-hidden="true" />
          <div className="pf-banner-body">
            <div className="pf-avatar-ring">
              <div className="pf-avatar">{initials}</div>
            </div>
            <div className="pf-banner-info">
              <h2 className="pf-banner-name">{user?.fullname || user?.email?.split("@")[0] || "Your Account"}</h2>
              <div className="pf-banner-meta">
                <RoleBadge role={user?.role} />
                <span className="pf-banner-email">{user?.email}</span>
                {pharmacyDetails && (
                  <span className="pf-banner-pharmacy">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M8 1.5A6.5 6.5 0 1 1 1.5 8 6.508 6.508 0 0 1 8 1.5zm0-1.5a8 8 0 1 0 8 8A8 8 0 0 0 8 0z" fill="currentColor" />
                      <path d="M8 4a.75.75 0 0 1 .75.75v3.5h2.5a.75.75 0 0 1 0 1.5H7.25V4.75A.75.75 0 0 1 8 4z" fill="currentColor" />
                    </svg>
                    {pharmacyDetails.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="pf-body">

          {/* Sidebar nav */}
          <nav className="pf-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pf-nav-item ${activeSection === item.id ? "pf-nav-item--active" : ""}`}
                onClick={item.onClick}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Panel */}
          <div className="pf-panel">

            {/* ── Personal Info ────────────────────────────────── */}
            {activeSection === "profile" && (
              <section className="pf-section">
                <SectionHeader
                  title="Personal Information"
                  description="Update your display name and email address."
                />
                <Feedback
                  type={profileMsg?.type}
                  message={profileMsg?.text}
                  onClose={() => setProfileMsg(null)}
                />
                <form className="pf-form" onSubmit={handleProfileSubmit}>
                  <div className="pf-form-grid">
                    <label className="pf-label">
                      Full Name
                      <input
                        className="pf-input"
                        name="fullname"
                        value={profileForm.fullname}
                        onChange={(e) => setProfileForm((f) => ({ ...f, fullname: e.target.value }))}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </label>
                    <label className="pf-label">
                      Email Address
                      <input
                        className="pf-input"
                        name="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>
                  </div>
                  <div className="pf-form-footer">
                    <button className="pf-btn pf-btn--primary" type="submit" disabled={profileLoading}>
                      {profileLoading ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>

              </section>
            )}

            {/* ── Security ─────────────────────────────────────── */}
            {activeSection === "security" && (
              <section className="pf-section">
                <SectionHeader
                  title="Security"
                  description="Manage your password and account security."
                />
                <Feedback
                  type={passwordMsg?.type}
                  message={passwordMsg?.text}
                  onClose={() => setPasswordMsg(null)}
                />

                <div className="pf-security-row">
                  <div className="pf-security-info">
                    <p className="pf-security-label">Password</p>
                    <p className="pf-security-hint">
                      {showPasswordForm
                        ? "Fill in the fields below to update your password."
                        : "Use a strong password you don't use elsewhere."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`pf-btn ${showPasswordForm ? "pf-btn--ghost" : "pf-btn--secondary"}`}
                    onClick={() => {
                      setShowPasswordForm((v) => !v);
                      setPasswordMsg(null);
                    }}
                  >
                    {showPasswordForm ? "Cancel" : "Change Password"}
                  </button>
                </div>

                {showPasswordForm && (
                  <form className="pf-form pf-form--inset" onSubmit={handlePasswordSubmit}>
                    <label className="pf-label">
                      Current Password
                      <input
                        className="pf-input"
                        type="password"
                        name="currentPassword"
                        placeholder="Current password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                        autoComplete="current-password"
                      />
                    </label>
                    <div className="pf-form-grid">
                      <label className="pf-label">
                        New Password
                        <input
                          className="pf-input"
                          type="password"
                          name="newPassword"
                          placeholder="At least 8 characters"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                          autoComplete="new-password"
                        />
                      </label>
                      <label className="pf-label">
                        Confirm Password
                        <input
                          className="pf-input"
                          type="password"
                          name="confirmPassword"
                          placeholder="Repeat new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                          autoComplete="new-password"
                        />
                      </label>
                    </div>
                    <div className="pf-form-footer">
                      <button className="pf-btn pf-btn--primary" type="submit" disabled={passwordLoading}>
                        {passwordLoading ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {/* ── Pharmacy (admin only) ─────────────────────────── */}
            {activeSection === "pharmacy" && isAdmin && (
              <section className="pf-section">
                <SectionHeader
                  title="Pharmacy Settings"
                  description="Update your pharmacy name and license number."
                />
                <Feedback
                  type={pharmacyMsg?.type}
                  message={pharmacyMsg?.text}
                  onClose={() => setPharmacyMsg(null)}
                />

                {pharmacyLoading ? (
                  <p className="pf-loading">Loading pharmacy details…</p>
                ) : (
                  <>
                    <form className="pf-form" onSubmit={handlePharmacySubmit}>
                      <div className="pf-form-grid">
                        <label className="pf-label">
                          Pharmacy Name
                          <input
                            className="pf-input"
                            name="name"
                            value={pharmacyForm.name}
                            onChange={(e) => setPharmacyForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Pharmacy name"
                          />
                        </label>
                        <label className="pf-label">
                          License Number
                          <input
                            className="pf-input"
                            name="licenseNumber"
                            value={pharmacyForm.licenseNumber}
                            onChange={(e) => setPharmacyForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                            placeholder="License number"
                          />
                        </label>
                      </div>
                      <div className="pf-form-footer">
                        <button className="pf-btn pf-btn--primary" type="submit" disabled={pharmacySaveLoading}>
                          {pharmacySaveLoading ? "Saving…" : "Save Pharmacy"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            )}

            {/* ── Billing (admin only) ─────────────────────────── */}
            {activeSection === "billing" && isAdmin && (() => {
              const tier   = subscription?.subscriptionTier  || "free";
              const status = subscription?.subscriptionStatus || "inactive";
              const plan   = PLAN_DISPLAY[tier] || { name: tier, price: "—" };
              const isActive = status === "active" || status === "trialing";
              const renewalDate = formatDate(subscription?.currentPeriodEnd);
              const cancels = subscription?.cancelAtPeriodEnd;

              return (
                <section className="pf-section">
                  <SectionHeader
                    title="Subscription & Billing"
                    description="View your current plan and manage billing details."
                    action={
                      <button
                        type="button"
                        className="pf-billing-refresh"
                        onClick={() => { fetchBilling(); fetchInvoices(); }}
                        disabled={billingLoading}
                        title="Refresh"
                      >
                        ↻
                      </button>
                    }
                  />

                  <Feedback
                    type={billingMsg?.type}
                    message={billingMsg?.text}
                    onClose={() => setBillingMsg(null)}
                  />

                  {billingLoading ? (
                    <p className="pf-loading">Loading subscription…</p>
                  ) : (
                    <div className="pf-billing-card">
                      <div className="pf-billing-plan-row">
                        <div className="pf-billing-plan-info">
                          <p className="pf-billing-label">Current Plan</p>
                          <p className="pf-billing-plan-name">{plan.name}</p>
                          <p className="pf-billing-plan-price">{plan.price}</p>
                        </div>
                        <span className={`badge ${SUB_STATUS_BADGE[status] || "badge-not-sent"}`}>
                          {status}
                        </span>
                      </div>

                      {isActive && renewalDate && (
                        <p className="pf-billing-validity">
                          {cancels
                            ? `Cancels on ${renewalDate}`
                            : `Renews on ${renewalDate}`}
                        </p>
                      )}

                      {!isActive && (
                        <p className="pf-billing-validity pf-billing-no-sub">
                          No active subscription.{" "}
                          <Link to={ROUTES.BILLING} className="pf-billing-link">
                            Choose a plan →
                          </Link>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pf-billing-actions">
                    {isActive && (
                      <button
                        type="button"
                        className="pf-btn pf-btn--secondary"
                        onClick={handlePortal}
                        disabled={billingPortalLoading}
                      >
                        {billingPortalLoading ? "Opening…" : "Manage Billing"}
                      </button>
                    )}
                    <Link to={ROUTES.BILLING} className="pf-btn pf-btn--ghost pf-billing-plans-link">
                      {isActive ? "Change Plan" : "View Plans"} →
                    </Link>
                  </div>

                  {/* Invoice history */}
                  <div className="pf-invoice-section">
                    <p className="pf-billing-label" style={{ marginBottom: "0.6rem" }}>Invoice History</p>
                    {invoicesLoading ? (
                      <p className="pf-loading">Loading invoices…</p>
                    ) : invoices.length === 0 ? (
                      <p className="pf-billing-validity pf-billing-no-sub">
                        No invoices yet. They will appear here after your first payment.
                      </p>
                    ) : (
                      <div className="pf-invoice-wrap">
                        <table className="pf-invoice-table">
                          <thead>
                            <tr>
                              <th>Invoice</th>
                              <th>Period</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Date</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoices.map((inv) => (
                              <tr key={inv.id}>
                                <td className="pf-invoice-num">{inv.number || inv.id.slice(-8)}</td>
                                <td>
                                  {inv.periodStart
                                    ? `${formatDateShort(inv.periodStart)} – ${formatDateShort(inv.periodEnd)}`
                                    : "—"}
                                </td>
                                <td><strong>{formatCents(inv.amountDue, inv.currency)}</strong></td>
                                <td>
                                  <span className={`badge ${INVOICE_STATUS_BADGE[inv.status] || "badge-not-sent"}`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td>{formatDateShort(inv.created)}</td>
                                <td className="pf-invoice-links">
                                  {inv.hostedInvoiceUrl && (
                                    <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="pf-billing-link">
                                      View
                                    </a>
                                  )}
                                  {inv.invoicePdf && (
                                    <a href={inv.invoicePdf} target="_blank" rel="noreferrer" className="pf-billing-link">
                                      PDF
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ProfilePage;
