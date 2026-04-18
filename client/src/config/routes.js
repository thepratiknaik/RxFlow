// Client-side route paths
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  RESET_PASSWORD: "/reset-password",
  PROFILE: "/profile",
  PATIENTS: "/patients",
  PRESCRIPTIONS: "/prescriptions",
  INVENTORY: "/inventory",
};

const readEnv = (key) =>
  process.env[`REACT_APP_${key}`] || process.env[`VITE_${key}`] || "";

const normalizeApiBaseUrl = (value) => {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
};

const normalizePath = (value) => {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

const joinPath = (left, right) => {
  const leftPart = normalizePath(left);
  const rightPart = normalizePath(right);

  if (leftPart === "/") {
    return rightPart;
  }

  if (rightPart === "/") {
    return leftPart;
  }

  return `${leftPart}${rightPart}`.replace(/\/\/+/, "/");
};

const getDefaultApiBaseUrl = () => {
  const explicitBaseUrl = readEnv("API_BASE_URL");

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const basePath = normalizePath(readEnv("API_BASE_PATH") || "/api");

  const protocol =
    readEnv("API_PROTOCOL") ||
    (typeof window !== "undefined"
      ? window.location.protocol.replace(":", "")
      : "");

  const host =
    readEnv("API_HOST") ||
    (typeof window !== "undefined" ? window.location.hostname : "");

  const port = readEnv("API_PORT");

  if (!protocol || !host) {
    return basePath;
  }

  const portSegment = port ? `:${port}` : "";
  return `${protocol}://${host}${portSegment}${basePath}`;
};

const authBasePath = normalizePath(readEnv("AUTH_BASE_PATH") || "/auth");

const getAuthEndpoint = (envName, fallbackPath) =>
  normalizePath(readEnv(envName) || joinPath(authBasePath, fallbackPath));

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: getAuthEndpoint("API_AUTH_REGISTER_ENDPOINT", "/register"),
    LOGIN: getAuthEndpoint("API_AUTH_LOGIN_ENDPOINT", "/login"),
    ME: getAuthEndpoint("API_AUTH_ME_ENDPOINT", "/me"),
    LOGOUT: getAuthEndpoint("API_AUTH_LOGOUT_ENDPOINT", "/logout"),
    RESET_PASSWORD: getAuthEndpoint(
      "API_AUTH_RESET_PASSWORD_ENDPOINT",
      "/reset-password",
    ),
  },
  PROFILE: {
    UPDATE: normalizePath("/profile"),
    CHANGE_PASSWORD: normalizePath("/profile/password"),
  },
  DRUGS: {
    LIST: normalizePath("/drugs"),
    PULL: normalizePath("/drugs/pull"),
    PULL_JOBS: normalizePath("/drugs/pull-jobs"),
    PULL_JOB: (jobId) => normalizePath(`/drugs/pull-jobs/${jobId}`),
  },
  PATIENTS: {
    LIST: normalizePath("/patients"),
    DETAIL: (id) => normalizePath(`/patients/${id}`),
  },
  PRESCRIPTIONS: {
    LIST: normalizePath("/prescriptions"),
    FHIR_SYNC: normalizePath("/prescriptions/fhir/sync"),
    DETAIL: (id) => normalizePath(`/prescriptions/${id}`),
    APPROVE_ET_IN: (id) =>
      normalizePath(`/prescriptions/${id}/approve-et-in`),
    INSURANCE: (id) => normalizePath(`/prescriptions/${id}/insurance`),
  },
  INVENTORY: {
    LOTS: normalizePath("/inventory/lots"),
  },
};

// API Base URL
export const API_BASE_URL = normalizeApiBaseUrl(getDefaultApiBaseUrl());
