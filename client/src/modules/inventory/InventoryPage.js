import React from "react";
import AppShell from "../../components/AppShell.js";
import "../dashboard/DashboardPage.css";

const InventoryPage = () => {
  return (
    <AppShell title="Inventory">
      <div className="card">
        <h3>Inventory Workspace</h3>
        <p>Stock visibility, replenishment flows, and low-stock alerts will live here.</p>
      </div>
    </AppShell>
  );
};

export default InventoryPage;
