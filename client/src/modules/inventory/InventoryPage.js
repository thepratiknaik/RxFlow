import React from "react";
import AppSidebar from "../../components/AppSidebar.js";
import ProfileDropdown from "../../components/ProfileDropdown.js";
import "../dashboard/DashboardPage.css";

const InventoryPage = () => {
  return (
    <div className="dashboard-layout">
      <AppSidebar />

      <div className="main-content">
        <header className="header">
          <h2>Inventory</h2>
          <div className="header-right">
            <ProfileDropdown />
          </div>
        </header>

        <div className="content">
          <div className="card">
            <h3>Inventory Workspace</h3>
            <p>Stock visibility, replenishment flows, and low-stock alerts will live here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
