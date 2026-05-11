import React from "react";
import AppShell from "../../components/AppShell.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import { useAuth } from "../../context/AuthContext.js";
import "./UsersPage.css";

const ROLE_OPTIONS = ["technician", "pharmacist", "admin"];

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const UsersPage = () => {
  const { user, listUsers, createUser, updateUserRole } = useAuth();
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [savingId, setSavingId] = React.useState("");
  const [message, setMessage] = React.useState({ tone: "", text: "" });
  const [pendingRoles, setPendingRoles] = React.useState({});
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [creatingUser, setCreatingUser] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "technician",
  });

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  React.useEffect(() => {
    if (!createModalOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setCreateModalOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [createModalOpen]);

  const fetchUsers = React.useCallback(
    async (query = "") => {
      setLoading(true);
      setError("");

      try {
        const response = await listUsers({ q: query });
        const nextUsers = response?.users || [];

        setUsers(nextUsers);
        setPendingRoles(
          nextUsers.reduce((accumulator, currentUser) => {
            accumulator[currentUser.id] = currentUser.role || "technician";
            return accumulator;
          }, {}),
        );
      } catch (err) {
        setError(err.message || "Failed to load users.");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [listUsers],
  );

  React.useEffect(() => {
    fetchUsers(searchQuery);
  }, [fetchUsers, searchQuery]);

  const handleOpenCreateModal = () => {
    setNewUser({
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "technician",
    });
    setMessage({ tone: "", text: "" });
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setMessage({ tone: "", text: "" });
  };

  const handleRefresh = () => {
    fetchUsers(searchQuery);
  };

  const handleRoleChange = (id, role) => {
    setPendingRoles((current) => ({
      ...current,
      [id]: role,
    }));
  };

  const handleRoleSave = async (id) => {
    const nextRole = pendingRoles[id];

    if (!nextRole) {
      return;
    }

    setSavingId(id);
    setMessage({ tone: "", text: "" });

    try {
      const response = await updateUserRole(id, nextRole);
      const updatedUser = response?.user;

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === id
            ? {
                ...item,
                ...(updatedUser || {}),
              }
            : item,
        ),
      );

      setMessage({
        tone: "success",
        text: `Updated role for ${updatedUser?.fullname || "user"}.`,
      });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err.message || "Failed to update role.",
      });
    } finally {
      setSavingId("");
    }
  };

  const handleNewUserFieldChange = (field, value) => {
    setNewUser((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (newUser.password !== newUser.confirmPassword) {
      setMessage({
        tone: "error",
        text: "New user passwords do not match.",
      });
      return;
    }

    setCreatingUser(true);
    setMessage({ tone: "", text: "" });

    try {
      await createUser(newUser);
      setNewUser({
        fullname: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "technician",
      });
      setMessage({
        tone: "success",
        text: "User created successfully.",
      });
      setCreateModalOpen(false);
      fetchUsers(searchQuery);
    } catch (err) {
      setMessage({
        tone: "error",
        text: err.message || "Failed to create user.",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <AppShell title="User Management">
      <div className="users-page">
        <div className="pg-head">
          <div className="users-toolbar-actions">
            <button
              type="button"
              className="users-refresh"
              onClick={handleRefresh}
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              className="users-refresh"
              onClick={handleOpenCreateModal}
            >
              + Create User
            </button>
          </div>
        </div>

        {message.text ? (
          <div className={`users-message ${message.tone}`}>{message.text}</div>
        ) : null}

        {error ? <div className="users-message error">{error}</div> : null}

        <Card className="users-table-card">
          <div className="users-search" style={{ marginBottom: "1rem" }}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or email"
              style={{ width: "100%" }}
            />
          </div>
          {loading ? (
            <EmptyState
              title="Loading users"
              description="Fetching user accounts..."
            />
          ) : users.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Try a different search or refresh the list."
            />
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const isSelf = String(item.id) === String(user?.id);
                    const selectedRole =
                      pendingRoles[item.id] || item.role || "technician";

                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.fullname || item.email?.split("@")[0] || "—"}
                          </strong>
                        </td>
                        <td>{item.email}</td>
                        <td>
                          <select
                            value={selectedRole}
                            onChange={(event) =>
                              handleRoleChange(item.id, event.target.value)
                            }
                            disabled={isSelf}
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span
                            className={`users-status ${item.isactive ? "active" : "inactive"}`}
                          >
                            {item.isactive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{formatDate(item.lastlogin)}</td>
                        <td>{formatDate(item.created_at || item.createdat)}</td>
                        <td>
                          <button
                            type="button"
                            className="users-save-btn"
                            onClick={() => handleRoleSave(item.id)}
                            disabled={savingId === item.id || isSelf}
                            title={
                              isSelf
                                ? "Use another admin account to change your own role."
                                : "Save role"
                            }
                          >
                            {savingId === item.id
                              ? "Saving..."
                              : isSelf
                                ? "Own role"
                                : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {createModalOpen ? (
        <div className="modal-backdrop" onClick={handleCloseCreateModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Create User</h3>
                <p>Add a new team member to the pharmacy system.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseCreateModal}
              >
                ×
              </button>
            </div>

            {message.text ? (
              <div className={`users-message ${message.tone}`}>{message.text}</div>
            ) : null}

            <form onSubmit={handleCreateUser}>
              <div className="users-create-form">
                <label className="users-form-label">
                  Full Name
                  <input
                    value={newUser.fullname}
                    onChange={(event) => handleNewUserFieldChange("fullname", event.target.value)}
                    placeholder="e.g. Jane Smith"
                    required
                    disabled={creatingUser}
                    autoComplete="name"
                  />
                </label>
                <label className="users-form-label">
                  Email Address
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(event) => handleNewUserFieldChange("email", event.target.value)}
                    placeholder="user@pharmacy.com"
                    required
                    disabled={creatingUser}
                    autoComplete="email"
                  />
                </label>
                <label className="users-form-label users-form-span2">
                  Role
                  <select
                    value={newUser.role}
                    onChange={(event) => handleNewUserFieldChange("role", event.target.value)}
                    disabled={creatingUser}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="users-form-label">
                  Temporary Password
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(event) => handleNewUserFieldChange("password", event.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    disabled={creatingUser}
                    autoComplete="new-password"
                  />
                </label>
                <label className="users-form-label">
                  Confirm Password
                  <input
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(event) => handleNewUserFieldChange("confirmPassword", event.target.value)}
                    placeholder="Repeat password"
                    required
                    minLength={8}
                    disabled={creatingUser}
                    autoComplete="new-password"
                  />
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="users-modal-btn users-modal-btn--secondary"
                  onClick={handleCloseCreateModal}
                  disabled={creatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="users-modal-btn users-modal-btn--primary"
                  disabled={creatingUser}
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default UsersPage;
