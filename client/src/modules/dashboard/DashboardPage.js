import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { ROUTES } from "../../config/routes.js";
import "./DashboardPage.css";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const stats = ["New Prescriptions", "In Process", "Ready", "Low Stock"];

  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">RxFlow</h2>
        <nav>
          <button className="active" onClick={() => navigate(ROUTES.DASHBOARD)}>Dashboard</button>
          <button onClick={() => navigate(ROUTES.PROFILE)}>Profile</button>
          <button onClick={() => navigate(ROUTES.PRESCRIPTIONS)}>Prescriptions</button>
          <button onClick={() => navigate(ROUTES.INVENTORY)}>Inventory</button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">

        {/* Header with Profile Avatar */}
        <header className="header">
          <h2>Dashboard</h2>
          <div className="header-right">
            <ProfileDropdown user={user} logout={logout} navigate={navigate} />
          </div>
        </header>

        {/* Page Content */}
        <div className="content">

          {/* Stats Cards */}
          <div className="stats-grid">
            {stats.map((item, index) => (
              <div className="card stat-card" key={index}>
                <h4>{item}</h4>
                <p>0</p>
              </div>
            ))}
          </div>

          {/* Lower Grid */}
          <div className="grid-2">
            <div className="card">
              <h3>Prescription Queue</h3>
              <p>Queue data will appear here...</p>
            </div>

            <div className="card">
              <h3>Inventory Alerts</h3>
              <p>No alerts right now</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Profile Dropdown Component
const ProfileDropdown = ({ user, logout, navigate }) => {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef();

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="profile-wrapper" ref={dropdownRef}>
      <div className="profile-mini" onClick={() => setOpen(!open)}>
        {user?.fullname?.charAt(0)}
      </div>
      {open && (
        <div className="dropdown">
          <p className="dropdown-name">{user?.fullname}</p>
          <p className="dropdown-email">{user?.email}</p>
          <div className="dropdown-divider" />
          <button onClick={() => navigate(ROUTES.PROFILE)}>View Profile</button>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;