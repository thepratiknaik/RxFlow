import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";
import Avatar from "./Avatar.js";

const ProfileDropdown = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef();

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleViewProfile = () => {
    setOpen(false);
    navigate(ROUTES.PROFILE);
  };

  const handleManageUsers = () => {
    setOpen(false);
    navigate(ROUTES.ADMIN_USERS);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="profile-wrapper" ref={dropdownRef}>
      <Avatar
        name={user?.fullname}
        className="profile-mini"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      />
      {open && (
        <div className="dropdown">
          <p className="dropdown-name">{user?.fullname}</p>
          <p className="dropdown-email">{user?.email}</p>
          <div className="dropdown-divider" />
          <button onClick={handleViewProfile}>View Profile</button>
          {isAdmin && <button onClick={handleManageUsers}>Manage Users</button>}
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
