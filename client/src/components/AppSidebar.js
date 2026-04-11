import React from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../config/routes.js";
import "./AppSidebar.css";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { label: "Dashboard", to: ROUTES.DASHBOARD },
  { label: "Profile", to: ROUTES.PROFILE },
  { label: "Patients", to: ROUTES.PATIENTS },
  { label: "Prescriptions", to: ROUTES.PRESCRIPTIONS },
  { label: "Inventory", to: ROUTES.INVENTORY },
  { label: "Prescribers", to: ROUTES.PRESCRIBER},
];

const AppSidebar = () => {
  return (
    <aside className="app-sidebar">
      {/* <h2 className="app-sidebar-logo">RxFlow</h2> */}
      <div className="brand">
        <img className="brand-logo" src={logo} alt="RxFlow logo" />
      </div>
      <nav className="app-sidebar-nav" aria-label="Application">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `app-sidebar-link${isActive ? " active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AppSidebar;
