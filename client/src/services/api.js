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
    const method = String(options.method || "GET").toUpperCase();

    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      if (method === "PATCH") {
        try {
          response = await fetch(url, {
            ...options,
            method: "PUT",
            headers,
          });
        } catch (fallbackError) {
          throw new ApiError(
            `Unable to reach the server for ${method} ${url}. Browser error: ${fallbackError?.message || "Unknown network error"}`,
            {
              code: "NETWORK_ERROR",
              details: fallbackError,
            },
          );
        }
      } else {
        throw new ApiError(
          `Unable to reach the server for ${method} ${url}. Browser error: ${error?.message || "Unknown network error"}`,
          {
            code: "NETWORK_ERROR",
            details: error,
          },
        );
      }
    }

    if (!response) {
      throw new ApiError(`Unable to reach the server for ${method} ${url}.`, {
        code: "NETWORK_ERROR",
      });
    }

    const { contentType, data, rawBody } = await this.parseResponse(response);

    if (response.ok && contentType.includes("text/html")) {
      throw new ApiError(
        "The client reached an unexpected non-API response. Check the frontend API base URL configuration.",
        {
          status: response.status,
          code: "UNEXPECTED_RESPONSE",
          details: {
            method: options.method || "GET",
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
          method: "GET",
        });
      }
    } finally {
      this.clearAuth();
    }
  }

  async resetPassword(email, newPassword) {
    return await this.request(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: "POST",
      body: JSON.stringify({
        email,
        newPassword,
      }),
    });
  }

  async listUsers({ q = "" } = {}) {
    const params = new URLSearchParams();

    if (String(q).trim()) {
      params.set("q", String(q).trim());
    }

    const path = params.toString()
      ? `${API_ENDPOINTS.AUTH.USERS}?${params.toString()}`
      : API_ENDPOINTS.AUTH.USERS;

    return await this.request(path, {
      method: "GET",
    });
  }

  async createUser({ fullname, email, password, confirmPassword, role }) {
    return await this.request(API_ENDPOINTS.AUTH.CREATE_USER, {
      method: "POST",
      body: JSON.stringify({
        fullname,
        email,
        password,
        confirmPassword,
        role,
      }),
    });
  }

  async updateUserRole(id, role) {
    return await this.request(API_ENDPOINTS.AUTH.USER_ROLE(id), {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async updateProfile(data) {
    return await this.request(API_ENDPOINTS.PROFILE.UPDATE, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async changePassword(data) {
    return await this.request(API_ENDPOINTS.PROFILE.CHANGE_PASSWORD, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getPharmacy() {
    return await this.request(API_ENDPOINTS.PHARMACY.DETAIL, {
      method: "GET",
    });
  }

  async updatePharmacy(data) {
    return await this.request(API_ENDPOINTS.PHARMACY.UPDATE, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async setupPharmacy(data) {
    const result = await this.request(API_ENDPOINTS.PHARMACY.SETUP, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result?.user) {
      this.storeAuth(result);
    }
    return result;
  }

  async listDrugs({ page = 1, limit = 20, search = "" } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    return await this.request(
      `${API_ENDPOINTS.DRUGS.LIST}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async pullDrugs({ searchTerm = "", limit = 25 } = {}) {
    return await this.request(API_ENDPOINTS.DRUGS.PULL, {
      method: "POST",
      body: JSON.stringify({
        searchTerm,
        limit,
      }),
    });
  }

  async listDrugPullJobs({ limit = 10 } = {}) {
    const params = new URLSearchParams({
      limit: String(limit),
    });

    return await this.request(
      `${API_ENDPOINTS.DRUGS.PULL_JOBS}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async getDrugPullJob(jobId) {
    return await this.request(API_ENDPOINTS.DRUGS.PULL_JOB(jobId), {
      method: "GET",
    });
  }

  async searchPatients({ q = "", page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (q.trim()) {
      params.set("q", q.trim());
    }

    return await this.request(
      `${API_ENDPOINTS.PATIENTS.LIST}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async getPatient(id) {
    return await this.request(API_ENDPOINTS.PATIENTS.DETAIL(id), {
      method: "GET",
    });
  }

  async createPatient(data) {
    return await this.request(API_ENDPOINTS.PATIENTS.LIST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePatient(id, data) {
    return await this.request(API_ENDPOINTS.PATIENTS.DETAIL(id), {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePatient(id) {
    return await this.request(API_ENDPOINTS.PATIENTS.DETAIL(id), {
      method: "DELETE",
    });
  }

  async listPatientInsurances(patientId) {
    return await this.request(API_ENDPOINTS.PATIENTS.INSURANCES(patientId), {
      method: "GET",
    });
  }

  async addPatientInsurance(patientId, data) {
    return await this.request(API_ENDPOINTS.PATIENTS.INSURANCES(patientId), {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePatientInsurance(patientId, insuranceId, data) {
    return await this.request(
      API_ENDPOINTS.PATIENTS.INSURANCE_DETAIL(patientId, insuranceId),
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async deletePatientInsurance(patientId, insuranceId) {
    return await this.request(
      API_ENDPOINTS.PATIENTS.INSURANCE_DETAIL(patientId, insuranceId),
      {
        method: "DELETE",
      },
    );
  }

  async listPrescriptions({
    status = "",
    source = "",
    page = 1,
    limit = 25,
  } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (String(status).trim()) {
      params.set("status", String(status).trim());
    }

    if (String(source).trim()) {
      params.set("source", String(source).trim());
    }

    return await this.request(
      `${API_ENDPOINTS.PRESCRIPTIONS.LIST}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async listPatientPrescriptions(patientId) {
    const params = new URLSearchParams({ patientId: String(patientId), limit: "100", page: "1" });
    return await this.request(
      `${API_ENDPOINTS.PRESCRIPTIONS.LIST}?${params.toString()}`,
      { method: "GET" },
    );
  }

  async getPrescription(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.DETAIL(id), {
      method: "GET",
    });
  }

  async syncFhirPrescriptions({ maxCount = 25, fhirBaseUrl = "" } = {}) {
    const body = { maxCount };
    if (fhirBaseUrl && String(fhirBaseUrl).trim()) {
      body.fhirBaseUrl = String(fhirBaseUrl).trim();
    }

    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.FHIR_SYNC, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async createPrescription(data) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.LIST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createPrescriptionEntry(data) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.ENTRY, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async approvePrescriptionEtIn(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.APPROVE_ET_IN(id), {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async patchPrescriptionInsurance(id, data) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.INSURANCE(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async sendPrescriptionForReview(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.SEND_FOR_REVIEW(id), {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async getDrugAvailability(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.DRUG_AVAILABILITY(id), {
      method: "GET",
    });
  }

  async getPrescriptionLots(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.LOTS(id), {
      method: "GET",
    });
  }

  async assignItemLot(prescriptionId, itemId, { lotId, quantity } = {}) {
    return await this.request(
      API_ENDPOINTS.PRESCRIPTIONS.ASSIGN_ITEM_LOT(prescriptionId, itemId),
      {
        method: "PATCH",
        body: JSON.stringify({ lotId: lotId || null, quantity: quantity || null }),
      },
    );
  }

  async markPrescriptionReady(id, lotId) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.MARK_READY(id), {
      method: "POST",
      body: JSON.stringify(lotId ? { lotId } : {}),
    });
  }

  async markPrescriptionPickedUp(id) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.MARK_PICKED_UP(id), {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async cancelPrescription(id, reason) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.CANCEL(id), {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async listPrescribers({ q = "", page = 1, limit = 100 } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (String(q).trim()) {
      params.set("q", String(q).trim());
    }

    return await this.request(
      `${API_ENDPOINTS.PRESCRIBERS.LIST}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async createPrescriber(data) {
    return await this.request(API_ENDPOINTS.PRESCRIBERS.LIST, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePrescriber(id, data) {
    return await this.request(API_ENDPOINTS.PRESCRIBERS.DETAIL(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getPrescriberHistory(id) {
    return await this.request(API_ENDPOINTS.PRESCRIBERS.HISTORY(id), {
      method: "GET",
    });
  }

  async deletePrescriber(id) {
    return await this.request(API_ENDPOINTS.PRESCRIBERS.DETAIL(id), {
      method: "DELETE",
    });
  }

  async getPrescriptionReview(token) {
    return await this.request(API_ENDPOINTS.PRESCRIPTIONS.REVIEW(token), {
      method: "GET",
    });
  }

  async approvePrescriptionReview(token) {
    return await this.request(
      API_ENDPOINTS.PRESCRIPTIONS.REVIEW_APPROVE(token),
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  async rejectPrescriptionReview(token) {
    return await this.request(
      API_ENDPOINTS.PRESCRIPTIONS.REVIEW_REJECT(token),
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  async listInventoryLots({
    page = 1,
    limit = 50,
    belowThreshold = false,
  } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (belowThreshold) {
      params.set("belowThreshold", "true");
    }

    return await this.request(
      `${API_ENDPOINTS.INVENTORY.LOTS}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async createInventoryLot(data) {
    return await this.request(API_ENDPOINTS.INVENTORY.LOTS, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInventoryLot(id, data) {
    return await this.request(API_ENDPOINTS.INVENTORY.LOT(id), {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryLot(id) {
    return await this.request(API_ENDPOINTS.INVENTORY.LOT(id), {
      method: "DELETE",
    });
  }

  async listAuditLogs({
    page = 1,
    limit = 25,
    entityType = "",
    action = "",
    q = "",
  } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (String(entityType).trim()) {
      params.set("entityType", String(entityType).trim());
    }

    if (String(action).trim()) {
      params.set("action", String(action).trim());
    }

    if (String(q).trim()) {
      params.set("q", String(q).trim());
    }

    return await this.request(
      `${API_ENDPOINTS.AUDIT_LOGS.LIST}?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async getBillingPlans() {
    return await this.request(API_ENDPOINTS.BILLING.PLANS, { method: "GET" });
  }

  async getBillingSubscription() {
    return await this.request(API_ENDPOINTS.BILLING.SUBSCRIPTION, { method: "GET" });
  }

  async createCheckoutSession(planId, successUrl, cancelUrl) {
    return await this.request(API_ENDPOINTS.BILLING.CHECKOUT, {
      method: "POST",
      body: JSON.stringify({ planId, successUrl, cancelUrl }),
    });
  }

  async createPortalSession() {
    return await this.request(API_ENDPOINTS.BILLING.PORTAL, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  async listBillingInvoices() {
    return await this.request(API_ENDPOINTS.BILLING.INVOICES, { method: "GET" });
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
