import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.js";
import AppShell from "../../components/AppShell.js";
import Avatar from "../../components/Avatar.js";
import Card from "../../components/Card.js";
import api from "../../services/api.js";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [pharmacySaveLoading, setPharmacySaveLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [pharmacyForm, setPharmacyForm] = useState({
    name: "",
    licenseNumber: "",
  });
  const [pharmacyDetails, setPharmacyDetails] = useState(null);

  useEffect(() => {
    const loadPharmacy = async () => {
      try {
        setPharmacyLoading(true);
        const response = await api.getPharmacy();
        if (response?.data) {
          setPharmacyDetails(response.data);
          setPharmacyForm({
            name: response.data.name || "",
            licenseNumber: response.data.licenseNumber || "",
          });
        }
      } catch (error) {
        console.error("Failed to load pharmacy details:", error);
      } finally {
        setPharmacyLoading(false);
      }
    };
    loadPharmacy();
  }, []);

  // Handle input changes
  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
  };

  const handlePharmacyChange = (e) => {
    setPharmacyForm({ ...pharmacyForm, [e.target.name]: e.target.value });
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

  const handlePharmacySubmit = async (e) => {
    e.preventDefault();
    try {
      setPharmacySaveLoading(true);
      const response = await api.updatePharmacy(pharmacyForm);
      if (response?.data) {
        setPharmacyDetails(response.data);
      }
      alert("Pharmacy updated successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || "Pharmacy update failed");
    } finally {
      setPharmacySaveLoading(false);
    }
  };

  return (
    <AppShell title="Profile">
      <div className="profile-page">
        <section className="profile-hero">
          <div>
            <p className="profile-eyebrow">Account settings</p>
            <h2>Manage your account profile</h2>
            <p className="profile-subtitle">
              Keep your personal details and security preferences up to date.
            </p>
          </div>
          <div className="profile-hero-metrics">
            <div>
              <span>Role</span>
              <strong>{user?.role || "Technician"}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email || "N/A"}</strong>
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <div className="profile-main">
            <Card className="profile-panel">
              <div className="profile-toolbar">
                <h3>Basic Information</h3>
                <p className="profile-subtitle">Update your personal details.</p>
              </div>
              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <label>
                  Full Name
                  <input
                    name="fullname"
                    value={profileForm.fullname}
                    onChange={handleProfileChange}
                    placeholder="Full Name"
                  />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="Email"
                  />
                </label>
                <button className="profile-primary-btn" type="submit" disabled={profileLoading}>
                  {profileLoading ? "Updating..." : "Save Changes"}
                </button>
              </form>
            </Card>

            <Card className="profile-panel">
              <div className="profile-toolbar profile-toolbar-inline">
                <div>
                  <h3>Change Password</h3>
                  <p className="profile-subtitle">Update your account password securely.</p>
                </div>
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                >
                  {showPasswordForm ? "Cancel" : "Change"}
                </button>
              </div>

              {showPasswordForm && (
                <form className="profile-form" onSubmit={handlePasswordSubmit}>
                  <label>
                    Current Password
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Current Password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                    />
                  </label>
                  <label>
                    New Password
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New Password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                    />
                  </label>
                  <label>
                    Confirm Password
                    <input
                      type="password"
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </label>
                  <button
                    className="profile-primary-btn"
                    type="submit"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </Card>

            {isAdmin && (
              <Card className="profile-panel">
                <div className="profile-toolbar">
                  <h3>Pharmacy Settings</h3>
                  <p className="profile-subtitle">
                    Manage pharmacy details and licensing.
                  </p>
                </div>
                <form className="profile-form" onSubmit={handlePharmacySubmit}>
                  <label>
                    Pharmacy Name
                    <input
                      name="name"
                      value={pharmacyForm.name}
                      onChange={handlePharmacyChange}
                      placeholder="Pharmacy Name"
                    />
                  </label>
                  <label>
                    License Number
                    <input
                      name="licenseNumber"
                      value={pharmacyForm.licenseNumber}
                      onChange={handlePharmacyChange}
                      placeholder="License Number"
                    />
                  </label>
                  <button
                    className="profile-primary-btn"
                    type="submit"
                    disabled={pharmacySaveLoading}
                  >
                    {pharmacySaveLoading ? "Updating..." : "Save Pharmacy"}
                  </button>
                </form>
              </Card>
            )}
          </div>

          <div className="profile-sidepanels">
            <Card className="profile-card profile-panel">
              <div className="profile-avatar-wrap">
                <Avatar name={user?.fullname} />
              </div>
              <h3>{user?.fullname || "Unknown User"}</h3>
              <p>{user?.email}</p>
              <span className="profile-chip">
                {user?.role || "Technician"}
              </span>
            </Card>

            {pharmacyDetails && (
              <Card className="profile-panel">
                <div className="profile-section-header">
                  <h3>Pharmacy Info</h3>
                </div>
                {pharmacyLoading ? (
                  <div className="profile-message">Loading pharmacy details...</div>
                ) : (
                  <div className="profile-detail-grid">
                    <div>
                      <span>Name</span>
                      <strong>{pharmacyDetails.name}</strong>
                    </div>
                    <div>
                      <span>License</span>
                      <strong>{pharmacyDetails.licenseNumber}</strong>
                    </div>
                    <div>
                      <span>Tier</span>
                      <strong className="profile-capitalize">
                        {pharmacyDetails.subscriptionTier}
                      </strong>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default ProfilePage;
