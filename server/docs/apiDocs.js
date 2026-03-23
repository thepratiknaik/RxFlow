import { getEndpointMetadata } from "./endpointMetadata.js";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);
const AUTH_MIDDLEWARE_NAMES = new Set([
  "verifyToken",
  "authenticate",
  "auth",
  "requireAuth",
]);

const toTitle = (value) =>
  value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const normalizePath = (value) => {
  if (!value || value === "/") {
    return "";
  }

  return value.startsWith("/") ? value : `/${value}`;
};

const joinPath = (basePath, routePath) => {
  const cleanBasePath = normalizePath(basePath);
  const cleanRoutePath = normalizePath(routePath);

  const combinedPath = `${cleanBasePath}${cleanRoutePath || ""}`;

  return combinedPath || "/";
};

const toEndpointId = (method, routePath) =>
  `${method.toLowerCase()}-${routePath
    .replace(/^\/+/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

const hasAuthMiddleware = (routeStack = []) =>
  routeStack.some((layer) => {
    const middlewareName = layer?.name || "";
    return AUTH_MIDDLEWARE_NAMES.has(middlewareName);
  });

const toEndpoint = ({ moduleName, method, routePath, routeStack }) => {
  const endpointPath = joinPath("", routePath);
  const metadata = getEndpointMetadata(method, endpointPath) || {};
  const hasBody = BODY_METHODS.has(method);

  return {
    id: toEndpointId(method, endpointPath),
    module: moduleName,
    method,
    path: endpointPath,
    name:
      metadata.name ||
      toTitle(endpointPath.split("/").filter(Boolean).join(" ")) ||
      `${method} ${endpointPath}`,
    description: metadata.description || "No description provided yet.",
    authRequired:
      typeof metadata.authRequired === "boolean"
        ? metadata.authRequired
        : hasAuthMiddleware(routeStack),
    requestBody: metadata.requestBody || null,
    hasBody,
    bodyLabel: metadata.requestBody?.label || "JSON body",
    exampleBody: metadata.requestBody?.example || (hasBody ? {} : null),
  };
};

const extractModuleEndpoints = (routeModule) => {
  const moduleName = routeModule.module || "General";
  const basePath = normalizePath(routeModule.basePath);

  return routeModule.router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const routePath = joinPath(basePath, layer.route.path);

      return Object.keys(layer.route.methods)
        .filter((method) => layer.route.methods[method])
        .map((method) =>
          toEndpoint({
            moduleName,
            method: method.toUpperCase(),
            routePath,
            routeStack: layer.route.stack,
          }),
        );
    });
};

const normalizeAdditionalEndpoint = (endpoint) => {
  const method = endpoint.method.toUpperCase();
  const path = joinPath("", endpoint.path);
  const hasBody = BODY_METHODS.has(method);

  return {
    id: toEndpointId(method, path),
    module: endpoint.module || "General",
    method,
    path,
    name: endpoint.name || `${method} ${path}`,
    description: endpoint.description || "No description provided yet.",
    authRequired: Boolean(endpoint.authRequired),
    requestBody: endpoint.requestBody || null,
    hasBody,
    bodyLabel: endpoint.requestBody?.label || "JSON body",
    exampleBody: endpoint.requestBody?.example || (hasBody ? {} : null),
  };
};

export const buildApiDocs = ({
  routeModules = [],
  additionalEndpoints = [],
}) => {
  const discoveredEndpoints = routeModules.flatMap((routeModule) =>
    extractModuleEndpoints(routeModule),
  );
  const staticEndpoints = additionalEndpoints.map((endpoint) =>
    normalizeAdditionalEndpoint(endpoint),
  );

  const endpoints = [...staticEndpoints, ...discoveredEndpoints].sort(
    (a, b) => {
      if (a.module !== b.module) {
        return a.module.localeCompare(b.module);
      }

      if (a.path !== b.path) {
        return a.path.localeCompare(b.path);
      }

      return a.method.localeCompare(b.method);
    },
  );

  const moduleMap = endpoints.reduce((accumulator, endpoint) => {
    if (!accumulator.has(endpoint.module)) {
      accumulator.set(endpoint.module, []);
    }

    accumulator.get(endpoint.module).push(endpoint);
    return accumulator;
  }, new Map());

  const modules = Array.from(moduleMap.entries()).map(
    ([title, moduleEndpoints]) => ({
      title,
      endpoints: moduleEndpoints,
    }),
  );

  const defaultOpenEndpoint = endpoints[0] || null;

  return {
    title: "RxFlow API Docs",
    subtitle: "Explore and test your API endpoints.",
    description:
      "Endpoints are discovered from Express route modules automatically. Add a new route file and it appears in docs.",
    authHeader: "Authorization: Bearer <jwt-token>",
    contentType: "application/json",
    defaultOpen: defaultOpenEndpoint?.id || null,
    endpoints,
    modules,
  };
};
