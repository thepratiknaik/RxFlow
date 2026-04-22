import React from "react";
import AppHeader from "./AppHeader.js";
import AppSidebar from "./AppSidebar.js";

const AppShell = ({ title, actions, children }) => {
  return (
    <div className="dashboard-layout">
      <AppSidebar />
      <div className="main-content">
        <AppHeader title={title} actions={actions} />
        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default AppShell;
