import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../../components/AppHeader.js";
import Card from "../../components/Card.js";
import { ROUTES } from "../../config/routes.js";
import { useAuth } from "../../context/AuthContext.js";
import api from "../../services/api.js";
import "./OnboardingPage.css";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, listUsers, setupPharmacy } = useAuth();
  const [pharmacyName, setPharmacyName] = React.useState("");
  const [licenseNumber, setLicenseNumber] = React.useState("");
  const [pharmacySaved, setPharmacySaved] = React.useState(false);
  const [savingPharmacy, setSavingPharmacy] = React.useState(false);
  const [teamReady, setTeamReady] = React.useState(false);
  const [loadingTeam, setLoadingTeam] = React.useState(true);
  const [message, setMessage] = React.useState({ tone: "", text: "" });
  const [currentStep, setCurrentStep] = React.useState(1);

  React.useEffect(() => {
    if (!user?.id || String(user?.role || "").toLowerCase() !== "admin") {
      return;
    }

    setPharmacySaved(Boolean(user?.pharmacyId));
  }, [user?.id, user?.pharmacyId, user?.role]);

  const refreshTeamStatus = React.useCallback(async () => {
    setLoadingTeam(true);

    try {
      const response = await listUsers({});
      const users = response?.users || [];
      setTeamReady(users.length > 1);
      setMessage((current) =>
        current.tone === "error" ? current : { tone: "", text: "" },
      );
    } catch {
      setTeamReady(false);
      setMessage({
        tone: "error",
        text: "Could not load team users for this pharmacy.",
      });
    } finally {
      setLoadingTeam(false);
    }
  }, [listUsers]);

  React.useEffect(() => {
    refreshTeamStatus();
  }, [refreshTeamStatus]);

  React.useEffect(() => {
    if (!pharmacySaved) {
      setCurrentStep(1);
      return;
    }

    if (!teamReady) {
      setCurrentStep(2);
      return;
    }

    setCurrentStep(3);
  }, [pharmacySaved, teamReady]);

  const handleSavePharmacy = async (event) => {
    event.preventDefault();

    const nextName = String(pharmacyName || "").trim();
    const nextLicense = String(licenseNumber || "").trim();

    if (!nextName || !nextLicense) {
      setMessage({
        tone: "error",
        text: "Add pharmacy name and license number to continue.",
      });
      return;
    }

    setSavingPharmacy(true);
    setMessage({ tone: "", text: "" });

    try {
      await api.setupPharmacy({
        name: nextName,
        licenseNumber: nextLicense,
      });
      setPharmacySaved(true);
      setCurrentStep(2);
      setMessage({
        tone: "success",
        text: "Pharmacy created successfully. Next: add your team users.",
      });
      await refreshTeamStatus();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error.message || "Failed to create pharmacy.",
      });
    } finally {
      setSavingPharmacy(false);
    }
  };

  const canFinish = pharmacySaved && teamReady;
  const maxUnlockedStep = !pharmacySaved ? 1 : !teamReady ? 2 : 3;

  const handleStepChange = (nextStep) => {
    if (nextStep < 1 || nextStep > 3 || nextStep > maxUnlockedStep) {
      return;
    }
    setCurrentStep(nextStep);
  };

  const handleFinish = () => {
    if (!canFinish) {
      return;
    }

    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="onboarding-screen">
      <AppHeader title="Onboarding" />
      <div className="onboarding-page">
        <div className="onboarding-modal-backdrop">
          <div className="onboarding-modal">
            <section className="onboarding-hero">
              <div>
                <p className="onboarding-eyebrow">Workspace setup</p>
                <h2>Welcome, {user?.fullname || "Admin"}</h2>
                <p className="onboarding-intro">
                  Complete these steps to unlock your dashboard.
                </p>
              </div>
              <div className="onboarding-hero-metrics">
                <div>
                  <span>Current step</span>
                  <strong>{currentStep} of 3</strong>
                </div>
                <div>
                  <span>Progress</span>
                  <strong>
                    {pharmacySaved && teamReady
                      ? "Ready to finish"
                      : pharmacySaved
                        ? "2/3 complete"
                        : "1/3 in progress"}
                  </strong>
                </div>
              </div>
            </section>

            <div className="onboarding-stepper">
              <button
                type="button"
                className={`onboarding-step-pill ${currentStep === 1 ? "active" : ""}`}
                onClick={() => handleStepChange(1)}
              >
                1. Pharmacy
              </button>
              <button
                type="button"
                className={`onboarding-step-pill ${currentStep === 2 ? "active" : ""}`}
                onClick={() => handleStepChange(2)}
                disabled={maxUnlockedStep < 2}
              >
                2. Team
              </button>
              <button
                type="button"
                className={`onboarding-step-pill ${currentStep === 3 ? "active" : ""}`}
                onClick={() => handleStepChange(3)}
                disabled={maxUnlockedStep < 3}
              >
                3. Finish
              </button>
            </div>

            {message.text ? (
              <div className={`onboarding-message ${message.tone}`}>
                {message.text}
              </div>
            ) : null}

            {currentStep === 1 ? (
              <Card className="onboarding-panel">
                <div className="onboarding-section-header">
                  <div>
                    <h3>Step 1: Create pharmacy</h3>
                    <p className="onboarding-step-copy">
                      This creates your pharmacy in the database and links it to
                      your admin account.
                    </p>
                  </div>
                  <span
                    className={`onboarding-status ${pharmacySaved ? "done" : "todo"}`}
                  >
                    {pharmacySaved ? "Completed" : "Pending"}
                  </span>
                </div>
                <form className="onboarding-form" onSubmit={handleSavePharmacy}>
                  <label>
                    Pharmacy Name
                    <input
                      value={pharmacyName}
                      onChange={(event) => setPharmacyName(event.target.value)}
                      placeholder="Pharmacy name"
                      required
                      disabled={savingPharmacy}
                    />
                  </label>
                  <label>
                    License Number
                    <input
                      value={licenseNumber}
                      onChange={(event) => setLicenseNumber(event.target.value)}
                      placeholder="License number"
                      required
                      disabled={savingPharmacy}
                    />
                  </label>
                  <div className="onboarding-actions-row">
                    <button type="submit" disabled={savingPharmacy}>
                      {savingPharmacy ? "Creating..." : "Create pharmacy"}
                    </button>
                  </div>
                </form>
              </Card>
            ) : null}

            {currentStep === 2 ? (
              <Card className="onboarding-panel">
                <div className="onboarding-section-header">
                  <div>
                    <h3>Step 2: Add users</h3>
                    <p className="onboarding-step-copy">
                      Add at least one additional user from the admin users
                      page.
                    </p>
                  </div>
                  <span
                    className={`onboarding-status ${teamReady ? "done" : "todo"}`}
                  >
                    {teamReady ? "Completed" : "Pending"}
                  </span>
                </div>
                <div className="onboarding-actions-row">
                  <Link to={ROUTES.ADMIN_USERS} className="onboarding-link-btn">
                    Go to user management
                  </Link>
                  <button type="button" onClick={refreshTeamStatus}>
                    {loadingTeam ? "Checking..." : "Refresh user status"}
                  </button>
                  <button
                    type="button"
                    className="onboarding-secondary-btn"
                    onClick={() => handleStepChange(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepChange(3)}
                    disabled={!teamReady}
                  >
                    Continue
                  </button>
                </div>
              </Card>
            ) : null}

            {currentStep === 3 ? (
              <Card className="onboarding-panel">
                <div className="onboarding-section-header">
                  <div>
                    <h3>Step 3: Open dashboard</h3>
                    <p className="onboarding-step-copy">
                      Finish onboarding after pharmacy and team setup are
                      complete.
                    </p>
                  </div>
                </div>
                <div className="onboarding-actions-row">
                  <button
                    type="button"
                    className="onboarding-secondary-btn"
                    onClick={() => handleStepChange(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={!canFinish}
                  >
                    Finish onboarding and open dashboard
                  </button>
                </div>
                {!canFinish ? (
                  <p className="onboarding-hint">
                    Complete step 1 and step 2 to continue.
                  </p>
                ) : null}
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
