import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "../dashboard/DashboardPage.css";

const InventoryPage = () => {
  return (
    <AppShell title="Inventory">
      <Card>
        <EmptyState
          title="Inventory Workspace"
          description="Stock visibility, replenishment flows, and low-stock alerts will live here."
        />
      </Card>
    </AppShell>
  );
};

export default InventoryPage;
