import React from "react";
import AppShell from "../../components/AppShell.js";
import "./DashboardPage.css";

const DashboardPage = () => {
  const stats = ["New Prescriptions", "In Process", "Ready", "Low Stock"];

  return (
    <AppShell title="Dashboard">
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
    </AppShell>
  );
};

export default DashboardPage;
