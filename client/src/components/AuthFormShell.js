import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../config/routes.js";

const AuthFormShell = ({
  title,
  subtitle,
  error,
  footer,
  children,
}) => {
  return (
    <div className="auth-card">
      <div className="auth-header">
        <Link to={ROUTES.HOME} className="auth-logo">
          RxFlow
        </Link>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {error ? <div className="error-message">{error}</div> : null}

      {children}

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  );
};

export default AuthFormShell;
