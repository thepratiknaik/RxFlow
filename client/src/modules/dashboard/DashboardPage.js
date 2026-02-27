import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <h1>Welcome, {user?.fullname}! 👋</h1>

        <div
          style={{
            background: "#f8f9fa",
            padding: "2rem",
            borderRadius: "8px",
            marginTop: "2rem",
          }}
        >
          <h2>User Profile</h2>
          <div style={{ marginTop: "1rem" }}>
            <p>
              <strong>Full Name:</strong> {user?.fullname}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Role:</strong> {user?.role}
            </p>
            <p>
              <strong>Account Status: </strong>
              {user?.isactive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>

        <div
          style={{
            background: "#e3f2fd",
            padding: "2rem",
            borderRadius: "8px",
            marginTop: "2rem",
          }}
        >
          <h2>Dashboard Modules</h2>
          <p>User dashboard and analytics coming soon...</p>
          <ul style={{ marginTop: "1rem" }}>
            <li>Inventory Management</li>
            <li>Order Processing</li>
            <li>Analytics &amp; Reports</li>
            <li>User Management</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
