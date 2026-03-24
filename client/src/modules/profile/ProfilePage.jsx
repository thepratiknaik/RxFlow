import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.js";
import { ROUTES } from "../../config/routes.js";
import "./ProfilePage.css";

const ProfilePage = () => {
    const { user, logout, updateProfile, changePassword } = useAuth();
    const navigate = useNavigate();

    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [profileForm, setProfileForm] = useState({
        fullname: user?.fullname || "",
        email: user?.email || "",
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // Handle input changes
    const handleProfileChange = (e) => {
        setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    };

    // Handle form submissions
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            setProfileLoading(true);
            await updateProfile(profileForm);
            alert("Profile updated successfully");
        } catch (err) {
            console.error(err);
            alert(err.message || "Update failed");
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        try {
            setPasswordLoading(true);
            await changePassword(passwordForm);
            alert("Password changed successfully");
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setShowPasswordForm(false);
        } catch (err) {
            console.error(err);
            alert(err.message || "Password change failed");
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="dashboard-layout">

            {/* Sidebar */}
            <aside className="sidebar">
                <h2 className="logo">RxFlow</h2>
                <nav>
                    <button onClick={() => navigate(ROUTES.DASHBOARD)}>Dashboard</button>
                    <button className="active" onClick={() => navigate(ROUTES.PROFILE)}>Profile</button>
                    <button onClick={() => navigate(ROUTES.PRESCRIPTIONS)}>Prescriptions</button>
                    <button onClick={() => navigate(ROUTES.INVENTORY)}>Inventory</button>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                {/* Header with Profile Dropdown */}
                <header className="header">
                    <h2>Profile</h2>
                    <div className="header-right">
                        <ProfileDropdown user={user} logout={logout} navigate={navigate} />
                    </div>
                </header>

                {/* Page Content */}
                <div className="content">
                    <div className="profile-grid">

                        {/* Profile Card */}
                        <div className="card profile-card">
                            <div className="avatar">{user?.fullname?.charAt(0)}</div>
                            <h3>{user?.fullname}</h3>
                            <p>{user?.email}</p>
                            <span className="role-badge">{user?.role || "Technician"}</span>
                        </div>

                        {/* Profile Forms */}
                        <div className="profile-sections">

                            {/* Update Profile */}
                            <div className="card">
                                <h3>Basic Information</h3>
                                <form className="form-grid" onSubmit={handleProfileSubmit}>
                                    <input
                                        name="fullname"
                                        value={profileForm.fullname}
                                        onChange={handleProfileChange}
                                        placeholder="Full Name"
                                    />
                                    <input
                                        name="email"
                                        value={profileForm.email}
                                        onChange={handleProfileChange}
                                        placeholder="Email"
                                    />
                                    <button className="update-btn" type="submit" disabled={profileLoading}>
                                        {profileLoading ? "Updating..." : "Save Changes"}
                                    </button>
                                </form>
                            </div>

                            {/* Change Password */}
                            <div className="card">
                                <div className="card-header">
                                    <h3>Change Password</h3>
                                    <button
                                        className="toggle-btn"
                                        onClick={() => setShowPasswordForm(!showPasswordForm)}
                                    >
                                        {showPasswordForm ? "Cancel" : "Change"}
                                    </button>
                                </div>

                                {showPasswordForm && (
                                    <form className="form-grid" onSubmit={handlePasswordSubmit}>
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            placeholder="Current Password"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <input
                                            type="password"
                                            name="newPassword"
                                            placeholder="New Password"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            placeholder="Confirm Password"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                        />
                                        <button className="update-btn" type="submit" disabled={passwordLoading}>
                                            {passwordLoading ? "Updating..." : "Update Password"}
                                        </button>
                                    </form>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileDropdown = ({ user, logout, navigate }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = React.useRef();

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = (e) => {
        e.stopPropagation();          
        logout();                      
        navigate(ROUTES.LOGIN);        
    };

    const handleViewProfile = (e) => {
        e.stopPropagation();
        navigate(ROUTES.PROFILE);
    };

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
                    <button onClick={handleViewProfile}>View Profile</button>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;