import { API_BASE_URL, API_ENDPOINTS } from "../config/routes.js";

class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiService {
  buildUrl(path) {
    return `${API_BASE_URL}${path}`;
  }

  async parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();

    if (!rawBody) {
      return { contentType, data: null, rawBody: "" };
    }

    if (contentType.includes("application/json")) {
      try {
        return {
          contentType,
          data: JSON.parse(rawBody),
          rawBody,
        };
      } catch {
        throw new ApiError("The server returned invalid JSON.", {
          status: response.status,
          code: "INVALID_JSON",
        });
      }
    }

    return { contentType, data: null, rawBody };
  }

  async request(path, options = {}) {
    const url = this.buildUrl(path);
    const token = localStorage.getItem("token");

    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      throw new ApiError(
        "Unable to reach the server. Check that the API is running and the client API URL is configured correctly.",
        {
          code: "NETWORK_ERROR",
          details: error,
        },
      );
    }

    const { contentType, data, rawBody } = await this.parseResponse(response);

    if (response.ok && !contentType.includes("application/json")) {
      throw new ApiError(
        "The client reached an unexpected non-API response. Check the frontend API base URL configuration.",
        {
          status: response.status,
          code: "UNEXPECTED_RESPONSE",
          details: {
            url,
            contentType,
            preview: rawBody.slice(0, 200),
          },
        },
      );
    }

    if (!response.ok) {
      const message =
        data?.message ||
        rawBody ||
        `Request failed with status ${response.status}.`;

      throw new ApiError(message, {
        status: response.status,
        code: data?.code || "REQUEST_FAILED",
        details: data,
      });
    }

    return data;
  }

  storeAuth(data) {
    if (data?.token) {
      localStorage.setItem("token", data.token);
    }

    if (data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }
  }

  clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  async register(fullname, email, password, confirmPassword) {
    const data = await this.request(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: JSON.stringify({
        fullname,
        email,
        password,
        confirmPassword,
      }),
    });

    this.storeAuth(data);
    return data;
  }

  async login(email, password) {
    const data = await this.request(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    this.storeAuth(data);
    return data;
  }

  async getCurrentUser() {
    const token = localStorage.getItem("token");

    if (!token) {
      return null;
    }

    try {
      const data = await this.request(API_ENDPOINTS.AUTH.ME, {
        method: "GET",
      });

      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      return data?.user || null;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        this.clearAuth();
        return null;
      }

      throw error;
    }
  }

  async logout() {
    try {
      if (localStorage.getItem("token")) {
        await this.request(API_ENDPOINTS.AUTH.LOGOUT, {
          method: "POST",
        });
      }
    } finally {
      this.clearAuth();
    }
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
export { ApiError };
export default api;
