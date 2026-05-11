import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";

const AuthContext = createContext();

const getOnboardingKey = (userId) => `onboarding-complete-${userId}`;

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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const resolveOnboardingState = React.useCallback((nextUser) => {
    const normalizedRole = String(nextUser?.role || "").toLowerCase();
    const shouldOnboard =
      normalizedRole === "admin" && !!nextUser?.id && !nextUser?.pharmacyId;

    setNeedsOnboarding(shouldOnboard);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          resolveOnboardingState(currentUser);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setNeedsOnboarding(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        setIsAuthenticated(false);
        setNeedsOnboarding(false);
      }

      setLoading(false);
    };

    checkAuth();
  }, [resolveOnboardingState]);

  const login = async (email, password) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setIsAuthenticated(true);
    resolveOnboardingState(result.user);
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
    resolveOnboardingState(result.user);
    return result;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
    setNeedsOnboarding(false);
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

  const createUser = async (data) => {
    return await api.createUser(data);
  };

  const setupPharmacy = async (data) => {
    const result = await api.setupPharmacy(data);
    if (result?.user) {
      setUser(result.user);
    }
    setNeedsOnboarding(false);
    return result;
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    needsOnboarding,
    login,
    register,
    logout,
    resetPassword,
    updateProfile,
    changePassword,
    listUsers,
    createUser,
    updateUserRole,
    setupPharmacy,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
