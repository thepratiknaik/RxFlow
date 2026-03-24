import React from "react";
import AppSidebar from "../../components/AppSidebar.js";
import ProfileDropdown from "../../components/ProfileDropdown.js";
import "../dashboard/DashboardPage.css";

const PrescriptionsPage = () => {
  return (
    <div className="dashboard-layout">
      <AppSidebar />

      <div className="main-content">
        <header className="header">
          <h2>Prescriptions</h2>
          <div className="header-right">
            <ProfileDropdown />
          </div>
        </header>

        <div className="content">
          <div className="card">
            <h3>Prescription Workspace</h3>
            <p>Prescription intake, queue management, and fulfillment tools will live here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsPage;
