import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import "./DashboardPage.css";

const DashboardPage = () => {
  const stats = ["New Prescriptions", "In Process", "Ready", "Low Stock"];

  return (
    <AppShell title="Dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((item, index) => (
          <Card className="stat-card" key={index}>
            <h4>{item}</h4>
            <p>0</p>
          </Card>
        ))}
      </div>

      {/* Lower Grid */}
      <div className="grid-2">
        <Card>
          <EmptyState
            title="Prescription Queue"
            description="Queue data will appear here..."
          />
        </Card>

        <Card>
          <EmptyState
            title="Inventory Alerts"
            description="No alerts right now"
          />
        </Card>
      </div>
    </AppShell>
  );
};

export default DashboardPage;
