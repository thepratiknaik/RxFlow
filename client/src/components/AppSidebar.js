import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";
import api from "../services/api.js";
import "./AppSidebar.css";

const getInitials = (name) => {
  if (!name) return "Rx";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

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
  const [pharmacyName, setPharmacyName] = React.useState("");

  React.useEffect(() => {
    api
      .getPharmacy()
      .then((res) => {
        if (res?.data?.name) setPharmacyName(res.data.name);
      })
      .catch(() => {});
  }, []);

  const navItems = React.useMemo(() => {
    if (String(user?.role || "").toLowerCase() !== "admin") {
      return NAV_ITEMS;
    }

    return [
      ...NAV_ITEMS,
      { label: "Users", to: ROUTES.ADMIN_USERS },
    ];
  }, [user?.role]);

  const initials = getInitials(pharmacyName);

  return (
    <aside className="app-sidebar">
      <div className="brand">
        <div className="brand-avatar">{initials}</div>
        <div className="brand-meta">
          <span className="brand-name">{pharmacyName || "Your Pharmacy"}</span>
        </div>
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
