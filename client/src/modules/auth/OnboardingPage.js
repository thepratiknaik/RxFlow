import React from "react";
import AppHeader from "../../components/AppHeader.js";
import { useAuth } from "../../context/AuthContext.js";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../config/routes.js";
import "./OnboardingPage.css";

const ROLE_OPTIONS = ["Pharmacist", "Technician"];

const INITIAL_USER_FORM = {
  fullname: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "Pharmacist",
};

const StepIcon = ({ step, status }) => {
  if (status === "done") {
    return (
      <span className="ob-step-icon ob-step-icon--done">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return <span className="ob-step-icon ob-step-icon--active">{step}</span>;
  }
  return <span className="ob-step-icon ob-step-icon--idle">{step}</span>;
};

const RoleBadge = ({ role }) => {
  const cls = String(role || "").toLowerCase();
  return <span className={`ob-role-badge ob-role-badge--${cls}`}>{role}</span>;
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, needsOnboarding, setupPharmacy, createUser, listUsers } = useAuth();

  // Redirect away if user was already onboarded when this page mounted
  const openedWhileNeeded = React.useRef(needsOnboarding);
  React.useEffect(() => {
    if (!openedWhileNeeded.current) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step tracking ───────────────────────────────────────────────
  const [currentStep, setCurrentStep] = React.useState(1);
  const [pharmacyDone, setPharmacyDone] = React.useState(false);
  const [teamDone, setTeamDone] = React.useState(false);

  // ── Step 1 state ────────────────────────────────────────────────
  const [pharmacyName, setPharmacyName] = React.useState("");
  const [licenseNumber, setLicenseNumber] = React.useState("");
  const [pharmacySaving, setPharmacySaving] = React.useState(false);
  const [pharmacyError, setPharmacyError] = React.useState("");

  // ── Step 2 state ────────────────────────────────────────────────
  const [teamUsers, setTeamUsers] = React.useState([]);
  const [teamLoading, setTeamLoading] = React.useState(false);
  const [userForm, setUserForm] = React.useState(INITIAL_USER_FORM);
  const [userSaving, setUserSaving] = React.useState(false);
  const [userError, setUserError] = React.useState("");
  const [userSuccess, setUserSuccess] = React.useState("");

  // ── Initialise from user context ────────────────────────────────
  React.useEffect(() => {
    if (user?.pharmacyId) {
      setPharmacyDone(true);
      setCurrentStep((s) => Math.max(s, 2));
    }
  }, [user?.pharmacyId]);

  // ── Load team users whenever step 2 is active ───────────────────
  const loadTeam = React.useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await listUsers({});
      const users = (res?.users || []).filter(
        (u) => String(u.role || "").toLowerCase() !== "admin",
      );
      setTeamUsers(users);
      setTeamDone(users.length >= 1);
    } catch {
      setTeamUsers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [listUsers]);

  React.useEffect(() => {
    if (currentStep >= 2) loadTeam();
  }, [currentStep, loadTeam]);

  // ── Step 1: save pharmacy ────────────────────────────────────────
  const handleSavePharmacy = async (e) => {
    e.preventDefault();
    const name = pharmacyName.trim();
    const license = licenseNumber.trim();
    if (!name || !license) {
      setPharmacyError("Both fields are required.");
      return;
    }
    setPharmacySaving(true);
    setPharmacyError("");
    try {
      await setupPharmacy({ name, licenseNumber: license });
      setPharmacyDone(true);
      setCurrentStep(2);
    } catch (err) {
      setPharmacyError(err.message || "Failed to create pharmacy.");
    } finally {
      setPharmacySaving(false);
    }
  };

  // ── Step 2: add user ────────────────────────────────────────────
  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm((f) => ({ ...f, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const { fullname, email, password, confirmPassword, role } = userForm;
    if (!fullname.trim() || !email.trim() || !password) {
      setUserError("Name, email and password are required.");
      return;
    }
    if (password !== confirmPassword) {
      setUserError("Passwords do not match.");
      return;
    }
    setUserSaving(true);
    setUserError("");
    setUserSuccess("");
    try {
      await createUser({ fullname: fullname.trim(), email: email.trim(), password, confirmPassword, role });
      setUserForm(INITIAL_USER_FORM);
      setUserSuccess(`${fullname.trim()} added successfully.`);
      await loadTeam();
    } catch (err) {
      setUserError(err.message || "Failed to add user.");
    } finally {
      setUserSaving(false);
    }
  };

  // ── Step 3: finish ───────────────────────────────────────────────
  const handleFinish = () => navigate(ROUTES.DASHBOARD);

  // ── Step status helpers ─────────────────────────────────────────
  const stepStatus = (step) => {
    if (step === 1) return pharmacyDone ? "done" : currentStep === 1 ? "active" : "idle";
    if (step === 2) return teamDone ? "done" : currentStep === 2 ? "active" : "idle";
    if (step === 3) return currentStep === 3 ? "active" : "idle";
    return "idle";
  };

  const canGoToStep = (step) => {
    if (step === 1) return true;
    if (step === 2) return pharmacyDone;
    if (step === 3) return pharmacyDone && teamDone;
    return false;
  };

  const progress = pharmacyDone && teamDone ? 100 : pharmacyDone ? 50 : 0;

  return (
    <div className="ob-screen">
      <AppHeader title="Setup" />

      <div className="ob-layout">
        {/* ── Sidebar ── */}
        <aside className="ob-sidebar">
          <div className="ob-sidebar-brand">
            <p className="ob-sidebar-eyebrow">RxFlow</p>
            <h2 className="ob-sidebar-title">Workspace Setup</h2>
            <p className="ob-sidebar-sub">
              Complete these steps to unlock your pharmacy dashboard.
            </p>
          </div>

          <nav className="ob-steps-nav">
            {[
              { n: 1, label: "Create Pharmacy", desc: "Register your pharmacy" },
              { n: 2, label: "Add Team Members", desc: "Invite pharmacists & technicians" },
              { n: 3, label: "Launch Dashboard", desc: "Start using RxFlow" },
            ].map(({ n, label, desc }) => (
              <button
                key={n}
                type="button"
                className={`ob-step-row ${currentStep === n ? "ob-step-row--active" : ""} ${!canGoToStep(n) ? "ob-step-row--locked" : ""}`}
                onClick={() => canGoToStep(n) && setCurrentStep(n)}
                disabled={!canGoToStep(n)}
              >
                <StepIcon step={n} status={stepStatus(n)} />
                <div className="ob-step-text">
                  <span className="ob-step-label">{label}</span>
                  <span className="ob-step-desc">{desc}</span>
                </div>
              </button>
            ))}
          </nav>

          <div className="ob-sidebar-progress">
            <div className="ob-progress-label">
              <span>Overall progress</span>
              <span>{progress}%</span>
            </div>
            <div className="ob-progress-track">
              <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="ob-sidebar-user">
            <div className="ob-user-avatar">
              {String(user?.fullname || "A")[0].toUpperCase()}
            </div>
            <div className="ob-user-info">
              <span className="ob-user-name">{user?.fullname || "Admin"}</span>
              <span className="ob-user-role">Administrator</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="ob-main">

          {/* ── Step 1 ── */}
          {currentStep === 1 && (
            <div className="ob-panel">
              <div className="ob-panel-header">
                <div>
                  <p className="ob-panel-eyebrow">Step 1 of 3</p>
                  <h3 className="ob-panel-title">Create Your Pharmacy</h3>
                  <p className="ob-panel-desc">
                    Register your pharmacy's details. This links your admin account to the pharmacy and activates your workspace.
                  </p>
                </div>
                {pharmacyDone && (
                  <span className="ob-badge ob-badge--done">Completed</span>
                )}
              </div>

              {pharmacyDone ? (
                <div className="ob-done-state">
                  <div className="ob-done-icon">✓</div>
                  <p>Pharmacy created successfully. Proceed to add your team.</p>
                  <button
                    type="button"
                    className="ob-btn ob-btn--primary"
                    onClick={() => setCurrentStep(2)}
                  >
                    Continue to Team Setup →
                  </button>
                </div>
              ) : (
                <form className="ob-form" onSubmit={handleSavePharmacy}>
                  {pharmacyError && (
                    <div className="ob-alert ob-alert--error">{pharmacyError}</div>
                  )}

                  <div className="ob-form-grid">
                    <label className="ob-label">
                      Pharmacy Name
                      <input
                        className="ob-input"
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="e.g. Sunrise Pharmacy"
                        required
                        disabled={pharmacySaving}
                      />
                    </label>
                    <label className="ob-label">
                      License Number
                      <input
                        className="ob-input"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. PH-2024-001"
                        required
                        disabled={pharmacySaving}
                      />
                    </label>
                  </div>

                  <div className="ob-form-actions">
                    <button
                      type="submit"
                      className="ob-btn ob-btn--primary"
                      disabled={pharmacySaving}
                    >
                      {pharmacySaving ? "Creating pharmacy…" : "Create Pharmacy →"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── Step 2 ── */}
          {currentStep === 2 && (
            <div className="ob-panel">
              <div className="ob-panel-header">
                <div>
                  <p className="ob-panel-eyebrow">Step 2 of 3</p>
                  <h3 className="ob-panel-title">Add Team Members</h3>
                  <p className="ob-panel-desc">
                    Add at least one pharmacist or technician to your team. You can always add more later from the admin panel.
                  </p>
                </div>
                {teamDone && (
                  <span className="ob-badge ob-badge--done">
                    {teamUsers.length} member{teamUsers.length !== 1 ? "s" : ""} added
                  </span>
                )}
              </div>

              {/* Add user form */}
              <div className="ob-user-form-box">
                <h4 className="ob-user-form-title">Add a new user</h4>
                {userError && (
                  <div className="ob-alert ob-alert--error">{userError}</div>
                )}
                {userSuccess && (
                  <div className="ob-alert ob-alert--success">{userSuccess}</div>
                )}
                <form className="ob-form" onSubmit={handleAddUser}>
                  <div className="ob-form-grid ob-form-grid--3">
                    <label className="ob-label">
                      Full Name
                      <input
                        className="ob-input"
                        name="fullname"
                        value={userForm.fullname}
                        onChange={handleUserFormChange}
                        placeholder="Jane Smith"
                        required
                        disabled={userSaving}
                      />
                    </label>
                    <label className="ob-label">
                      Email
                      <input
                        className="ob-input"
                        name="email"
                        type="email"
                        value={userForm.email}
                        onChange={handleUserFormChange}
                        placeholder="jane@pharmacy.com"
                        required
                        disabled={userSaving}
                      />
                    </label>
                    <label className="ob-label">
                      Role
                      <select
                        className="ob-input"
                        name="role"
                        value={userForm.role}
                        onChange={handleUserFormChange}
                        disabled={userSaving}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <label className="ob-label">
                      Password
                      <input
                        className="ob-input"
                        name="password"
                        type="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        placeholder="Temporary password"
                        required
                        disabled={userSaving}
                      />
                    </label>
                    <label className="ob-label">
                      Confirm Password
                      <input
                        className="ob-input"
                        name="confirmPassword"
                        type="password"
                        value={userForm.confirmPassword}
                        onChange={handleUserFormChange}
                        placeholder="Repeat password"
                        required
                        disabled={userSaving}
                      />
                    </label>
                  </div>
                  <div className="ob-form-actions">
                    <button
                      type="submit"
                      className="ob-btn ob-btn--secondary"
                      disabled={userSaving}
                    >
                      {userSaving ? "Adding user…" : "+ Add User"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Team list */}
              <div className="ob-team-section">
                <div className="ob-team-header">
                  <h4 className="ob-team-title">
                    Team members
                    {teamLoading ? (
                      <span className="ob-team-loading"> — loading…</span>
                    ) : (
                      <span className="ob-team-count"> ({teamUsers.length})</span>
                    )}
                  </h4>
                  <button
                    type="button"
                    className="ob-btn ob-btn--ghost"
                    onClick={loadTeam}
                    disabled={teamLoading}
                  >
                    Refresh
                  </button>
                </div>

                {teamUsers.length === 0 && !teamLoading ? (
                  <div className="ob-team-empty">
                    No team members added yet. Add at least one user above to continue.
                  </div>
                ) : (
                  <ul className="ob-team-list">
                    {teamUsers.map((u) => (
                      <li key={u.id} className="ob-team-item">
                        <div className="ob-team-avatar">
                          {String(u.fullname || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="ob-team-info">
                          <span className="ob-team-name">{u.fullname || "—"}</span>
                          <span className="ob-team-email">{u.email}</span>
                        </div>
                        <RoleBadge role={u.role} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="ob-step-actions">
                <button
                  type="button"
                  className="ob-btn ob-btn--ghost"
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="ob-btn ob-btn--primary"
                  onClick={() => setCurrentStep(3)}
                  disabled={!teamDone}
                >
                  {teamDone ? "Continue →" : "Add at least one user to continue"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {currentStep === 3 && (
            <div className="ob-panel">
              <div className="ob-panel-header">
                <div>
                  <p className="ob-panel-eyebrow">Step 3 of 3</p>
                  <h3 className="ob-panel-title">You're all set!</h3>
                  <p className="ob-panel-desc">
                    Your pharmacy is configured and your team is ready. Launch the dashboard to start processing prescriptions.
                  </p>
                </div>
                <span className="ob-badge ob-badge--done">Ready</span>
              </div>

              <div className="ob-summary">
                <div className="ob-summary-item">
                  <div className="ob-summary-icon ob-summary-icon--done">✓</div>
                  <div>
                    <strong>Pharmacy created</strong>
                    <p>Your workspace is registered and active.</p>
                  </div>
                </div>
                <div className="ob-summary-item">
                  <div className="ob-summary-icon ob-summary-icon--done">✓</div>
                  <div>
                    <strong>{teamUsers.length} team member{teamUsers.length !== 1 ? "s" : ""} added</strong>
                    <p>
                      {teamUsers.map((u) => u.fullname || u.email).join(", ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="ob-step-actions">
                <button
                  type="button"
                  className="ob-btn ob-btn--ghost"
                  onClick={() => setCurrentStep(2)}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="ob-btn ob-btn--primary ob-btn--launch"
                  onClick={handleFinish}
                >
                  Launch Dashboard →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default OnboardingPage;
