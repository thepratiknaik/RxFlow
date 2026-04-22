import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";
import "./AppSidebar.css";
import logo from "../assets/logo.png";

const NAV_ITEMS = [
  { label: "Dashboard", to: ROUTES.DASHBOARD },
  { label: "Profile", to: ROUTES.PROFILE },
  { label: "Patients", to: ROUTES.PATIENTS },
  { label: "Prescriptions", to: ROUTES.PRESCRIPTIONS },
  { label: "Inventory", to: ROUTES.INVENTORY },
  { label: "Prescribers", to: ROUTES.PRESCRIBER },
];

const AppSidebar = () => {
  const { user } = useAuth();
  const navItems = React.useMemo(() => {
    if (String(user?.role || "").toLowerCase() !== "admin") {
      return NAV_ITEMS;
    }

    return [...NAV_ITEMS, { label: "Users", to: ROUTES.ADMIN_USERS }];
  }, [user?.role]);

  return (
    <aside className="app-sidebar">
      {/* <h2 className="app-sidebar-logo">RxFlow</h2> */}
      <div className="brand">
        <img className="brand-logo" src={logo} alt="RxFlow logo" />
      </div>
      <nav className="app-sidebar-nav" aria-label="Application">
        {navItems.map((item) => (
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
