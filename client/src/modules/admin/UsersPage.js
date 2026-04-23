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
  const [creatingUser, setCreatingUser] = React.useState(false);
  const [newUser, setNewUser] = React.useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "technician",
  });

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

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
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
        <Card className="users-toolbar-card">
          <div className="users-toolbar">
            <div>
              <h3>Admin users</h3>
              <p className="users-subtitle">
                Manage team access and update roles for other users.
              </p>
            </div>

            <div className="users-toolbar-actions">
              <form className="users-search" onSubmit={handleSearchSubmit}>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by name or email"
                />
                <button type="submit">Search</button>
              </form>
              <button
                type="button"
                className="users-refresh"
                onClick={handleRefresh}
              >
                Refresh
              </button>
            </div>
          </div>
        </Card>

        {message.text ? (
          <div className={`users-message ${message.tone}`}>{message.text}</div>
        ) : null}

        {error ? <div className="users-message error">{error}</div> : null}

        <Card className="users-create-card">
          <h3>Add new user</h3>
          <p className="users-subtitle">
            Create team accounts directly from admin user management.
          </p>
          <form className="users-create-form" onSubmit={handleCreateUser}>
            <input
              value={newUser.fullname}
              onChange={(event) =>
                handleNewUserFieldChange("fullname", event.target.value)
              }
              placeholder="Full name"
              required
              disabled={creatingUser}
            />
            <input
              type="email"
              value={newUser.email}
              onChange={(event) =>
                handleNewUserFieldChange("email", event.target.value)
              }
              placeholder="Email"
              required
              disabled={creatingUser}
            />
            <select
              value={newUser.role}
              onChange={(event) =>
                handleNewUserFieldChange("role", event.target.value)
              }
              disabled={creatingUser}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <input
              type="password"
              value={newUser.password}
              onChange={(event) =>
                handleNewUserFieldChange("password", event.target.value)
              }
              placeholder="Temporary password"
              required
              minLength={8}
              disabled={creatingUser}
            />
            <input
              type="password"
              value={newUser.confirmPassword}
              onChange={(event) =>
                handleNewUserFieldChange("confirmPassword", event.target.value)
              }
              placeholder="Confirm password"
              required
              minLength={8}
              disabled={creatingUser}
            />
            <button type="submit" disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create user"}
            </button>
          </form>
        </Card>

        <Card className="users-table-card">
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
                          <strong>{item.fullname}</strong>
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
    </AppShell>
  );
};

export default UsersPage;
