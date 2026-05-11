import React from "react";
import AppHeader from "./AppHeader.js";
import AppSidebar from "./AppSidebar.js";
import AppFooter from "./AppFooter.js";

const AppShell = ({ title, actions, children }) => {
  return (
    <div className="dashboard-layout">
      <AppSidebar />
      <div className="main-content">
        <AppHeader title={title} actions={actions} />
        <div className="content">{children}</div>
        <AppFooter />
      </div>
    </div>
  );
};

export default AppShell;
