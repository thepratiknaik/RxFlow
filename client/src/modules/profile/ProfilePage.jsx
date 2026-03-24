import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.js";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import "./ProfilePage.css";

const ProfilePage = () => {
    const { user, updateProfile, changePassword } = useAuth();

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
        <AppShell title="Profile">
            <div className="profile-grid">

                {/* Profile Card */}
                <Card className="profile-card">
                    <div className="avatar">{user?.fullname?.charAt(0)}</div>
                    <h3>{user?.fullname}</h3>
                    <p>{user?.email}</p>
                    <span className="role-badge">{user?.role || "Technician"}</span>
                </Card>

                {/* Profile Forms */}
                <div className="profile-sections">

                    {/* Update Profile */}
                    <Card>
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
                    </Card>

                    {/* Change Password */}
                    <Card>
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
                    </Card>

                </div>
            </div>
        </AppShell>
    );
};

export default ProfilePage;
