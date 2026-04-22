import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (String(user?.role || "").toLowerCase() !== "admin") {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children;
};

export default AdminRoute;
