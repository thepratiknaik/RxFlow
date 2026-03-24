import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import "../dashboard/DashboardPage.css";

const InventoryPage = () => {
  return (
    <AppShell title="Inventory">
      <Card>
        <h3>Inventory Workspace</h3>
        <p>Stock visibility, replenishment flows, and low-stock alerts will live here.</p>
      </Card>
    </AppShell>
  );
};

export default InventoryPage;
