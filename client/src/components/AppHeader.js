import React from "react";
import ProfileDropdown from "./ProfileDropdown.js";

const AppHeader = ({ title, actions }) => {
  return (
    <header className="header">
      <h2>{title}</h2>
      <div className="header-right">{actions ?? <ProfileDropdown />}</div>
    </header>
  );
};

export default AppHeader;
