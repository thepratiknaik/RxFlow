import React from "react";
import AppSidebar from "../../components/AppSidebar.js";
import ProfileDropdown from "../../components/ProfileDropdown.js";
import "./DashboardPage.css";

const DashboardPage = () => {
  const stats = ["New Prescriptions", "In Process", "Ready", "Low Stock"];

  return (
    <div className="dashboard-layout">
      <AppSidebar />

      {/* Main Content */}
      <div className="main-content">

        {/* Header with Profile Avatar */}
        <header className="header">
          <h2>Dashboard</h2>
          <div className="header-right">
            <ProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <div className="content">

          {/* Stats Cards */}
          <div className="stats-grid">
            {stats.map((item, index) => (
              <div className="card stat-card" key={index}>
                <h4>{item}</h4>
                <p>0</p>
              </div>
            ))}
          </div>

          {/* Lower Grid */}
          <div className="grid-2">
            <div className="card">
              <h3>Prescription Queue</h3>
              <p>Queue data will appear here...</p>
            </div>

            <div className="card">
              <h3>Inventory Alerts</h3>
              <p>No alerts right now</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
