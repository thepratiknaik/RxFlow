import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./LoginPage.css";
import { useAuth } from "../../context/AuthContext.js";
import { ROUTES } from "../../config/routes.js";
import AuthLayout from "../../components/AuthLayout.js";
import AuthFormShell from "../../components/AuthFormShell.js";

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    newPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await resetPassword(formData.email, formData.newPassword);

      // Success state
      setIsSuccess(true);

      // Clear sensitive data
      setFormData({
        email: "",
        newPassword: "",
      });
    } catch (err) {
      setError(err.message || "Reset failed. Please try again.");
      console.error("Reset error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthFormShell
        title="Reset Password"
        subtitle="Enter your email and new password"
        error={isSuccess ? "" : error}
        footer={
          <p>
            Remember your password?{" "}
            <Link to={ROUTES.LOGIN} className="auth-switch-link">
              Sign in
            </Link>
          </p>
        }
      >
        {/* CONDITIONAL UI */}
        {isSuccess ? (
            <div className="auth-form">
              <div className="success-message">
                Password reset successfully!
              </div>
              <p style={{ textAlign: "center", marginBottom: "20px" }}>
                You can now log in with your new credentials.
              </p>

              <Link to={ROUTES.LOGIN}>
                <button className="auth-submit-btn">
                  Go to Login
                </button>
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
      </AuthFormShell>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
