import { API_BASE_URL, API_ENDPOINTS } from "../config/routes.js";

class ApiService {
  // Authentication endpoints
  async register(fullname, email, password, confirmPassword) {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullname,
          email,
          password,
          confirmPassword,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  }

  async getCurrentUser() {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }

    const data = await response.json();
    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data.user;
  }

  async logout() {
    const token = localStorage.getItem("token");

    if (token) {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Remove token from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  getToken() {
    return localStorage.getItem("token");
  }

  getUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    return !!localStorage.getItem("token");
  }
}

const api = new ApiService();
export default api;
