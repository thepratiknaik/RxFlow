import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import { ROUTES } from "../../config/routes.js";
import { useAuth } from "../../context/AuthContext.js";
import "./OnboardingPage.css";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, listUsers, completeOnboarding } = useAuth();
  const [pharmacyName, setPharmacyName] = React.useState("");
  const [licenseNumber, setLicenseNumber] = React.useState("");
  const [pharmacySaved, setPharmacySaved] = React.useState(false);
  const [teamReady, setTeamReady] = React.useState(false);
  const [loadingTeam, setLoadingTeam] = React.useState(true);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (!user?.id) {
      return;
    }

    const savedData = localStorage.getItem(`onboarding-pharmacy-${user.id}`);
    if (!savedData) {
      return;
    }

    try {
      const parsed = JSON.parse(savedData);
      setPharmacyName(parsed.name || "");
      setLicenseNumber(parsed.license || "");
      setPharmacySaved(Boolean(parsed.name && parsed.license));
    } catch {
      // Ignore malformed local data.
    }
  }, [user?.id]);

  const refreshTeamStatus = React.useCallback(async () => {
    setLoadingTeam(true);

    try {
      const response = await listUsers({});
      const users = response?.users || [];
      setTeamReady(users.length > 1);
    } catch {
      setTeamReady(false);
    } finally {
      setLoadingTeam(false);
    }
  }, [listUsers]);

  React.useEffect(() => {
    refreshTeamStatus();
  }, [refreshTeamStatus]);

  const handleSavePharmacy = (event) => {
    event.preventDefault();

    const nextName = String(pharmacyName || "").trim();
    const nextLicense = String(licenseNumber || "").trim();

    if (!nextName || !nextLicense || !user?.id) {
      setMessage("Add pharmacy name and license number to continue.");
      return;
    }

    localStorage.setItem(
      `onboarding-pharmacy-${user.id}`,
      JSON.stringify({ name: nextName, license: nextLicense }),
    );

    setPharmacySaved(true);
    setMessage("Pharmacy setup saved. Next: add your team users.");
  };

  const canFinish = pharmacySaved && teamReady;

  const handleFinish = () => {
    if (!canFinish) {
      return;
    }

    completeOnboarding();
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <AppShell title="Admin Onboarding">
      <div className="onboarding-page">
        <Card>
          <h2>Welcome, {user?.fullname || "Admin"}</h2>
          <p className="onboarding-intro">
            Complete this quick setup before entering the dashboard.
          </p>
        </Card>

        <Card>
          <h3>Step 1: Setup pharmacy</h3>
          <p className="onboarding-step-copy">
            Confirm your pharmacy details for this workspace.
          </p>
          <form className="onboarding-form" onSubmit={handleSavePharmacy}>
            <input
              value={pharmacyName}
              onChange={(event) => setPharmacyName(event.target.value)}
              placeholder="Pharmacy name"
              required
            />
            <input
              value={licenseNumber}
              onChange={(event) => setLicenseNumber(event.target.value)}
              placeholder="License number"
              required
            />
            <button type="submit">Save pharmacy setup</button>
          </form>
          <span
            className={`onboarding-status ${pharmacySaved ? "done" : "todo"}`}
          >
            {pharmacySaved ? "Completed" : "Pending"}
          </span>
        </Card>

        <Card>
          <h3>Step 2: Add users</h3>
          <p className="onboarding-step-copy">
            Add at least one additional user from the admin users page.
          </p>
          <div className="onboarding-actions-row">
            <Link to={ROUTES.ADMIN_USERS} className="onboarding-link-btn">
              Go to user management
            </Link>
            <button type="button" onClick={refreshTeamStatus}>
              {loadingTeam ? "Checking..." : "Refresh user status"}
            </button>
          </div>
          <span className={`onboarding-status ${teamReady ? "done" : "todo"}`}>
            {teamReady ? "Completed" : "Pending"}
          </span>
        </Card>

        <Card>
          <h3>Step 3: Go to dashboard</h3>
          <p className="onboarding-step-copy">
            Once pharmacy setup and users are complete, finish onboarding.
          </p>
          <button type="button" onClick={handleFinish} disabled={!canFinish}>
            Finish onboarding and open dashboard
          </button>
          {!canFinish ? (
            <p className="onboarding-hint">
              Complete step 1 and step 2 to continue.
            </p>
          ) : null}
        </Card>

        {message ? <div className="onboarding-message">{message}</div> : null}
      </div>
    </AppShell>
  );
};

export default OnboardingPage;
