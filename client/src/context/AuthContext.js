import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const register = async (fullname, email, password, confirmPassword) => {
    const result = await api.register(
      fullname,
      email,
      password,
      confirmPassword,
    );
    setUser(result.user);
    setIsAuthenticated(true);
    return result;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const resetPassword = async (email, newPassword) => {
    const result = await api.resetPassword(email, newPassword);
    return result;
  };

  const updateProfile = async (data) => {
    const result = await api.updateProfile(data);

    // update state immediately
    setUser(result.user);
    setIsAuthenticated(true);

    // persist (important for refresh)
    localStorage.setItem("user", JSON.stringify(result.user));

    return result;
  };

  const changePassword = async (data) => {
    const result = await api.changePassword(data);
    return result;
  };

  const listUsers = async (params = {}) => {
    return await api.listUsers(params);
  };

  const updateUserRole = async (id, role) => {
    return await api.updateUserRole(id, role);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
    listUsers,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
