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
  "GET /api/auth/logout": {
    name: "Logout",
    description:
      "Validates the active token and returns a logout confirmation.",
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
