import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "../dashboard/DashboardPage.css";

const PrescriptionsPage = () => {
  return (
    <AppShell title="Prescriptions">
      <Card>
        <EmptyState
          title="Prescription Workspace"
          description="Prescription intake, queue management, and fulfillment tools will live here."
        />
      </Card>
    </AppShell>
  );
};

export default PrescriptionsPage;
