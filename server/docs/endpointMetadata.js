const endpointMetadata = {
  "GET /api/health": {
    name: "Health Check",
    description:
      "Confirms that the API is running and returns a server timestamp.",
  },
  "POST /api/auth/register": {
    name: "Register",
    description:
      "Creates a user account and returns a token with the created user object.",
    requestBody: {
      label: "Registration payload",
      fields: [
        {
          name: "fullname",
          type: "string",
          required: true,
          example: "Jane Doe",
        },
        {
          name: "email",
          type: "string",
          required: true,
          example: "jane@example.com",
        },
        {
          name: "password",
          type: "string",
          required: true,
          example: "password123",
        },
        {
          name: "confirmPassword",
          type: "string",
          required: true,
          example: "password123",
        },
      ],
    },
  },
  "POST /api/auth/login": {
    name: "Login",
    description: "Authenticates an existing user and returns a fresh token.",
    requestBody: {
      label: "Login payload",
      fields: [
        {
          name: "email",
          type: "string",
          required: true,
          example: "jane@example.com",
        },
        {
          name: "password",
          type: "string",
          required: true,
          example: "password123",
        },
      ],
    },
  },
  "POST /api/auth/reset-password": {
    name: "Reset Password",
    description: "Updates the password for a user identified by email.",
    requestBody: {
      label: "Reset password payload",
      fields: [
        {
          name: "email",
          type: "string",
          required: true,
          example: "jane@example.com",
        },
        {
          name: "newPassword",
          type: "string",
          required: true,
          example: "newPassword123",
        },
      ],
    },
  },
  "GET /api/auth/me": {
    name: "Current User",
    description: "Returns the authenticated user's profile fields.",
  },
  "PATCH /api/profile": {
    name: "Update Profile",
    description:
      "Updates the authenticated user's profile details such as full name and email.",
    requestBody: {
      label: "Profile update payload",
      fields: [
        {
          name: "fullname",
          type: "string",
          required: false,
          example: "John Doe",
        },
        {
          name: "email",
          type: "string",
          required: false,
          example: "john.doe@example.com",
        },
      ],
    },
  },
  "PATCH /api/profile/password": {
    name: "Change Password",
    description: "Changes the authenticated user's password.",
    requestBody: {
      label: "Change password payload",
      fields: [
        {
          name: "currentPassword",
          type: "string",
          required: true,
          example: "password123",
        },
        {
          name: "newPassword",
          type: "string",
          required: true,
          example: "newPassword123",
        },
        {
          name: "confirmPassword",
          type: "string",
          required: true,
          example: "newPassword123",
        },
      ],
    },
  },
  "GET /api/auth/logout": {
    name: "Logout",
    description:
      "Validates the active token and returns a logout confirmation.",
  },
  "GET /api/drugs": {
    name: "List Drugs",
    description:
      "Returns paginated drugs stored in the local catalog. Supports search by brand, generic name, or NDC.",
    authRequired: true,
  },
  "POST /api/drugs/pull": {
    name: "Pull Drugs",
    description:
      "Queues a background job that pulls drug records from openFDA and upserts them into the local drugs table.",
    authRequired: true,
    requestBody: {
      label: "Drug pull payload",
      fields: [
        {
          name: "searchTerm",
          type: "string",
          required: false,
          example: "amoxicillin",
        },
        {
          name: "limit",
          type: "number",
          required: false,
          example: 25,
        },
      ],
    },
  },
  "GET /api/drugs/pull-jobs/:jobId": {
    name: "Pull Job Status",
    description:
      "Returns queue status, attempts, and latest result for a queued drug pull job.",
    authRequired: true,
  },
  "GET /api/drugs/pull-jobs": {
    name: "List Pull Jobs",
    description:
      "Returns recent queued/active/delayed/completed/failed pull jobs with per-state summary.",
    authRequired: true,
  },
  "GET /api/drugs/pull-audits": {
    name: "Pull Audit Logs",
    description:
      "Returns paginated audit history of drug pull jobs including status and row counts.",
    authRequired: true,
  },
  "GET /api/patients": {
    name: "Search Patients",
    description:
      "Searches patients by name, email, phone, patient number, or medical record number with pagination support.",
    authRequired: true,
  },
  "POST /api/patients": {
    name: "Create Patient",
    description:
      "Creates a new patient record with comprehensive demographic and healthcare information.",
    authRequired: true,
    requestBody: {
      label: "Patient creation payload",
      fields: [
        {
          name: "firstName",
          type: "string",
          required: true,
          example: "John",
        },
        {
          name: "lastName",
          type: "string",
          required: true,
          example: "Doe",
        },
        {
          name: "middleName",
          type: "string",
          required: false,
          example: "Michael",
        },
        {
          name: "dateOfBirth",
          type: "string",
          required: true,
          example: "1990-01-15",
        },
        {
          name: "gender",
          type: "string",
          required: false,
          example: "male",
        },
        {
          name: "email",
          type: "string",
          required: false,
          example: "john@example.com",
        },
        {
          name: "phonePrimary",
          type: "string",
          required: true,
          example: "(555) 123-4567",
        },
        {
          name: "phoneSecondary",
          type: "string",
          required: false,
          example: "(555) 987-6543",
        },
        {
          name: "addressLine1",
          type: "string",
          required: true,
          example: "123 Main St",
        },
        {
          name: "addressLine2",
          type: "string",
          required: false,
          example: "Apt 4B",
        },
        {
          name: "city",
          type: "string",
          required: true,
          example: "Springfield",
        },
        {
          name: "state",
          type: "string",
          required: true,
          example: "IL",
        },
        {
          name: "zipCode",
          type: "string",
          required: true,
          example: "62701",
        },
        {
          name: "patientNumber",
          type: "string",
          required: true,
          example: "PAT-001234",
        },
        {
          name: "mrn",
          type: "string",
          required: false,
          example: "MRN-987654",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          example: "VIP patient, prefers morning appointments",
        },
      ],
    },
  },
  "GET /api/patients/:id": {
    name: "Get Patient",
    description: "Retrieves a specific patient record by ID.",
    authRequired: true,
  },
  "PUT /api/patients/:id": {
    name: "Update Patient",
    description:
      "Updates patient information. Changes are tracked field-by-field in audit logs.",
    authRequired: true,
    requestBody: {
      label: "Patient update payload (any field optional)",
      fields: [
        {
          name: "firstName",
          type: "string",
          required: false,
          example: "Jane",
        },
        {
          name: "lastName",
          type: "string",
          required: false,
          example: "Smith",
        },
        {
          name: "middleName",
          type: "string",
          required: false,
          example: "Marie",
        },
        {
          name: "gender",
          type: "string",
          required: false,
          example: "female",
        },
        {
          name: "email",
          type: "string",
          required: false,
          example: "jane@example.com",
        },
        {
          name: "phonePrimary",
          type: "string",
          required: false,
          example: "(555) 987-6543",
        },
        {
          name: "phoneSecondary",
          type: "string",
          required: false,
          example: "(555) 111-2222",
        },
        {
          name: "addressLine1",
          type: "string",
          required: false,
          example: "456 Oak Ave",
        },
        {
          name: "addressLine2",
          type: "string",
          required: false,
          example: "Suite 200",
        },
        {
          name: "city",
          type: "string",
          required: false,
          example: "Shelbyville",
        },
        {
          name: "state",
          type: "string",
          required: false,
          example: "IL",
        },
        {
          name: "zipCode",
          type: "string",
          required: false,
          example: "62702",
        },
        {
          name: "mrn",
          type: "string",
          required: false,
          example: "MRN-111111",
        },
        {
          name: "notes",
          type: "string",
          required: false,
          example: "Updated insurance information",
        },
      ],
    },
  },
  "GET /api/patients/:patientId/audits": {
    name: "Patient Audit Logs",
    description:
      "Returns paginated audit history of all operations performed on a patient record including creates, updates, reads, and searches.",
    authRequired: true,
  },
};

const buildExampleBody = (requestBody) => {
  if (!requestBody?.fields?.length) {
    return null;
  }

  return requestBody.fields.reduce((payload, field) => {
    payload[field.name] = field.example ?? "";
    return payload;
  }, {});
};

export const getEndpointMetadata = (method, path) => {
  const metadata = endpointMetadata[`${method.toUpperCase()} ${path}`];

  if (!metadata) {
    return null;
  }

  return {
    ...metadata,
    requestBody: metadata.requestBody
      ? {
          ...metadata.requestBody,
          example: buildExampleBody(metadata.requestBody),
        }
      : null,
  };
};
