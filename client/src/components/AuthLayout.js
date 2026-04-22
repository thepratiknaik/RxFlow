import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-page">
      <div className="auth-container">{children}</div>
    </div>
  );
};

export default AuthLayout;
