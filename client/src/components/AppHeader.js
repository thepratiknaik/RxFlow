import React from "react";
import ProfileDropdown from "./ProfileDropdown.js";
import logo from "../assets/logo.png";
import "./AppHeader.css";

const AppHeader = ({ title, actions }) => {
  return (
    <header className="header">
      <div className="header-left">
        <h2>{title}</h2>
      </div>
      <div className="header-center" aria-label="Application logo">
        <img src={logo} alt="RxFlow" className="header-logo-image" />
        <span className="header-logo-text">RxFlow</span>
      </div>
      <div className="header-right">{actions ?? <ProfileDropdown />}</div>
    </header>
  );
};

export default AppHeader;
