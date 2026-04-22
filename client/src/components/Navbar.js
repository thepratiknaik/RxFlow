import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";
import "./Navbar.css";
import logo from "../assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate(ROUTES.HOME);
  };

  // Handle scroll to track active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "how-it-works",
        "features",
        "services",
        "testimonials",
        "contact",
      ];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Check if section is in viewport (top area)
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            return;
          }
        }
      }
      // Default to home if no section is in view
      if (window.scrollY < 100) {
        setActiveSection("home");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle smooth scroll
  const handleNavClick = (e, href) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setActiveSection(targetId);
        setMobileMenuOpen(false); // Close mobile menu after navigation
      }
    }
  };

  // Check if link is active
  const isActive = (href) => {
    if (href === "/" && activeSection === "home") return true;
    if (href.startsWith("#")) {
      return activeSection === href.substring(1);
    }
    return false;
  };

  return (
    <header>
      <div className="header-container">
        {/* PART 1: Logo/Brand Section */}
        <div className="navbar-brand">
          <a href="/" className="logo">
            <span className="logo-mark">
              <img src={logo} alt="RxFlow" className="logo-image" />
            </span>
            <span className="logo-text">
              <span className="logo-title">RxFlow</span>
              <span className="logo-tagline">Pharmacy workflow</span>
            </span>
          </a>
        </div>

        {/* Hamburger Menu Icon */}
        <button
          className={`hamburger ${mobileMenuOpen ? "active" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* PART 2: Navigation Menu Section */}
        <nav className={`navbar-menu ${mobileMenuOpen ? "active" : ""}`}>
          <a
            href="/"
            className={`nav-link ${activeSection === "home" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setActiveSection("home");
              setMobileMenuOpen(false);
            }}
          >
            Home
          </a>
          <a
            href="#how-it-works"
            className={`nav-link ${isActive("#how-it-works") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, "#how-it-works")}
          >
            How It Works
          </a>
          <a
            href="#features"
            className={`nav-link ${isActive("#features") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, "#features")}
          >
            Features
          </a>
          <a
            href="#services"
            className={`nav-link ${isActive("#services") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, "#services")}
          >
            Services
          </a>
          <a
            href="#testimonials"
            className={`nav-link ${isActive("#testimonials") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, "#testimonials")}
          >
            Testimonials
          </a>
          <a
            href="#contact"
            className={`nav-link ${isActive("#contact") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, "#contact")}
          >
            Contact
          </a>

          {/* Action buttons inside menu for mobile */}
          <div className="navbar-actions-mobile">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="btn-login">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn-signup"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "white",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="btn-login">
                  Login
                </Link>
                <Link to={ROUTES.SIGNUP} className="btn-signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* PART 3: Action Buttons Section (Desktop only) */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to={ROUTES.DASHBOARD} className="btn-login">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="btn-signup"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN} className="btn-login">
                Login
              </Link>
              <Link to={ROUTES.SIGNUP} className="btn-signup">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </header>
  );
};

export default Navbar;
