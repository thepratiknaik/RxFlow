import React from "react";
import AppShell from "../../components/AppShell.js";
import "../dashboard/DashboardPage.css";

const PrescriptionsPage = () => {
  return (
    <AppShell title="Prescriptions">
      <div className="card">
        <h3>Prescription Workspace</h3>
        <p>Prescription intake, queue management, and fulfillment tools will live here.</p>
      </div>
    </AppShell>
  );
};

export default PrescriptionsPage;
