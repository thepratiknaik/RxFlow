import React from "react";
import ProfileDropdown from "./ProfileDropdown.js";
import logo from "../assets/logo.png";
import "./AppHeader.css";

const AppHeader = ({ title, actions }) => {
  return (
    <div className="app-header">
      <div className="app-header-left">
        <h2>{title}</h2>
      </div>
      <div className="app-header-center" aria-label="Application logo">
        <img src={logo} alt="RxFlow" className="app-header-logo-image" />
        <span className="app-header-logo-text">RxFlow</span>
      </div>
      <div className="app-header-right">{actions ?? <ProfileDropdown />}</div>
    </div>
  );
};

export default AppHeader;
