import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { ROUTES } from "../config/routes.js";

const ProfileDropdown = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="profile-wrapper" ref={dropdownRef}>
      <div
        className="profile-mini"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        {user?.fullname?.charAt(0)}
      </div>
      {open && (
        <div className="dropdown">
          <p className="dropdown-name">{user?.fullname}</p>
          <p className="dropdown-email">{user?.email}</p>
          <div className="dropdown-divider" />
          <button onClick={handleViewProfile}>View Profile</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
