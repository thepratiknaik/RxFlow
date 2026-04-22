import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { useAuth } from "../../context/AuthContext.js";
import { ROUTES } from "../../config/routes.js";
import AuthLayout from "../../components/AuthLayout.js";
import AuthFormShell from "../../components/AuthFormShell.js";

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      console.log("Login successful:", result);
      // Redirect to dashboard after successful login
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthFormShell
        title="Welcome Back"
        subtitle="Sign in to your account to continue"
        error={error}
        footer={
          <p>
            Don't have an account?{" "}
            <Link to={ROUTES.SIGNUP} className="auth-switch-link">
              Sign up
            </Link>
          </p>
        }
      >
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
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" disabled={loading} />
                <span>Remember me</span>
              </label>
              {/* <a href="#forgot" className="forgot-link">
                Forgot password?
              </a> */}
              <Link to={ROUTES.RESET_PASSWORD} className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
      </AuthFormShell>
    </AuthLayout>
  );
};

export default LoginPage;
