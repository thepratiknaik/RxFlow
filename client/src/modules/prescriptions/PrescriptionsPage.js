import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import "../dashboard/DashboardPage.css";

const PrescriptionsPage = () => {
  return (
    <AppShell title="Prescriptions">
      <Card>
        <h3>Prescription Workspace</h3>
        <p>Prescription intake, queue management, and fulfillment tools will live here.</p>
      </Card>
    </AppShell>
  );
};

export default PrescriptionsPage;
