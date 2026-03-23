const baseUrl = window.location.origin;

const elements = {
  baseUrl: document.getElementById("base-url"),
  copyBaseUrlButton: document.getElementById("copy-base-url"),
  pageTitle: document.getElementById("page-title"),
  heroTitle: document.getElementById("hero-title"),
  heroDescription: document.getElementById("hero-description"),
  authBadge: document.getElementById("auth-badge"),
  formatBadge: document.getElementById("format-badge"),
  authHeaderPreview: document.getElementById("auth-header-preview"),
  tokenInput: document.getElementById("token"),
  copyTokenButton: document.getElementById("copy-token"),
  clearTokenButton: document.getElementById("clear-token"),
  heroMetrics: document.getElementById("hero-metrics"),
  referenceGrid: document.getElementById("reference-grid"),
  moduleList: document.getElementById("module-list"),
  testerList: document.getElementById("tester-list"),
};

elements.baseUrl.textContent = baseUrl;

const resizeTextarea = (textarea) => {
  if (!textarea) {
    return;
  }

  textarea.style.height = "auto";
  const minimumHeight = textarea.classList.contains("token-box") ? 220 : 120;
  textarea.style.height = `${Math.max(textarea.scrollHeight, minimumHeight)}px`;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const prettyJson = (value) => JSON.stringify(value, null, 2);

const getTesterId = (endpoint) => `${endpoint.id}-tester`;

let docsState = null;

let copyButtonStateTimer;
let baseUrlCopyButtonTimer;

const setCopyButtonState = (label, timeout = 1600) => {
  const button = elements.copyTokenButton;

  if (!button) {
    return;
  }

  window.clearTimeout(copyButtonStateTimer);
  button.dataset.state = label;
  button.setAttribute("aria-label", label);
  button.title = label;

  copyButtonStateTimer = window.setTimeout(() => {
    button.dataset.state = "";
    button.setAttribute("aria-label", "Copy token");
    button.title = "Copy token";
  }, timeout);
};

const copyTokenToClipboard = async () => {
  const token = elements.tokenInput.value.trim();

  if (!token) {
    setCopyButtonState("No Token");
    return;
  }

  try {
    await navigator.clipboard.writeText(token);
    setCopyButtonState("Copied");
  } catch (error) {
    const fallbackInput = elements.tokenInput;
    fallbackInput.focus();
    fallbackInput.select();

    const copied = document.execCommand("copy");
    setCopyButtonState(copied ? "Copied" : "Copy Failed");

    if (!copied) {
      console.error("Token copy failed", error);
    }

    window.getSelection()?.removeAllRanges();
    fallbackInput.setSelectionRange(0, 0);
    fallbackInput.blur();
  }
};

const setBadgeCopyButtonState = (button, label, timeout = 1400) => {
  if (!button) {
    return;
  }

  window.clearTimeout(baseUrlCopyButtonTimer);
  button.dataset.state = label;
  button.textContent = label;

  baseUrlCopyButtonTimer = window.setTimeout(() => {
    button.dataset.state = "";
    button.textContent = "Copy";
  }, timeout);
};

const copyBaseUrlToClipboard = async () => {
  const copied = await copyTextValue(baseUrl);
  setBadgeCopyButtonState(
    elements.copyBaseUrlButton,
    copied ? "Copied" : "Failed",
  );
};

const copyTextValue = async (value) => {
  if (!value) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (error) {
    const fallbackInput = document.createElement("textarea");
    fallbackInput.value = value;
    fallbackInput.setAttribute("readonly", "readonly");
    fallbackInput.style.position = "absolute";
    fallbackInput.style.left = "-9999px";
    document.body.appendChild(fallbackInput);
    fallbackInput.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(fallbackInput);
    window.getSelection()?.removeAllRanges();
    return copied;
  }
};

const setInlineCopyButtonState = (button, label, timeout = 1400) => {
  if (!button) {
    return;
  }

  const status = button.querySelector("[data-copy-status]");

  if (status) {
    status.textContent = label;
  }

  button.dataset.copyState = label;

  const existingTimerId = Number(button.dataset.copyTimerId || 0);
  if (existingTimerId) {
    window.clearTimeout(existingTimerId);
  }

  const timerId = window.setTimeout(() => {
    if (status) {
      status.textContent = "Copy";
    }

    button.dataset.copyState = "";
  }, timeout);

  button.dataset.copyTimerId = String(timerId);
};

const buildExampleBody = (requestBody) => {
  if (!requestBody?.fields?.length) {
    return {};
  }

  return requestBody.fields.reduce((payload, field) => {
    payload[field.name] = field.example ?? "";
    return payload;
  }, {});
};

const normalizeEndpointPath = (value) => {
  if (!value || value === "/") {
    return "/";
  }

  return value.replace(/\/+$/, "") || "/";
};

const findEndpoint = (method, path) =>
  docsState?.endpoints?.find(
    (endpoint) =>
      endpoint.method === method &&
      normalizeEndpointPath(endpoint.path) === normalizeEndpointPath(path),
  );

const setFieldExample = (endpoint, fieldName, value) => {
  if (!endpoint?.requestBody?.fields?.length || !value) {
    return;
  }

  const targetField = endpoint.requestBody.fields.find(
    (field) => field.name === fieldName,
  );

  if (!targetField) {
    return;
  }

  targetField.example = value;
  endpoint.exampleBody = buildExampleBody(endpoint.requestBody);
};

const refreshEndpointEditors = () => {
  if (!docsState?.endpoints?.length) {
    return;
  }

  docsState.endpoints.forEach((endpoint) => {
    if (!endpoint.hasBody) {
      return;
    }

    const textarea = document.getElementById(`${endpoint.id}-body`);

    if (!textarea || !endpoint.exampleBody) {
      return;
    }

    textarea.value = prettyJson(endpoint.exampleBody);
    resizeTextarea(textarea);
  });
};

const applyExampleUpdates = (method, path, fieldUpdates = {}) => {
  const endpoint = findEndpoint(method, path);

  if (!endpoint) {
    return;
  }

  Object.entries(fieldUpdates).forEach(([fieldName, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    setFieldExample(endpoint, fieldName, value);
  });

  if (!endpoint.exampleBody) {
    return;
  }

  const textarea = document.getElementById(`${endpoint.id}-body`);

  if (!textarea) {
    return;
  }

  textarea.value = prettyJson(endpoint.exampleBody);
  resizeTextarea(textarea);
};

const syncAuthMetadata = ({ fullname, email, password }) => {
  applyExampleUpdates("POST", "/api/auth/register", {
    fullname,
    email,
    password,
    confirmPassword: password,
  });

  applyExampleUpdates("POST", "/api/auth/login", {
    email,
    password,
  });
};

const syncProfileMetadata = ({ fullname, email, password }) => {
  applyExampleUpdates("PATCH", "/api/profile", {
    fullname,
    email,
  });

  applyExampleUpdates("PATCH", "/api/profile/password", {
    currentPassword: password,
    newPassword: password,
    confirmPassword: password,
  });
};

const renderMetrics = (endpoints) => {
  const protectedCount = endpoints.filter(
    (endpoint) => endpoint.authRequired,
  ).length;
  const modulesCount = new Set(endpoints.map((endpoint) => endpoint.module))
    .size;

  elements.heroMetrics.innerHTML = `
    <div class="metric">
      <strong>${endpoints.length}</strong>
      <p>Documented endpoints.</p>
    </div>
    <div class="metric">
      <strong>${protectedCount}</strong>
      <p>Protected routes using bearer auth.</p>
    </div>
    <div class="metric">
      <strong>${modulesCount}</strong>
      <p>Modules discovered automatically.</p>
    </div>
  `;
};

const renderReference = (docs) => {
  elements.referenceGrid.innerHTML = `
    <article class="doc-card">
      <h3>Base URL</h3>
      <p>All endpoints are relative to the current server origin.</p>
      <pre class="code-block"><code>${escapeHtml(baseUrl)}</code></pre>
    </article>
    <article class="doc-card">
      <h3>Authentication</h3>
      <p>Protected endpoints require a JWT in the <code>Authorization</code> header.</p>
      <pre class="code-block"><code>${escapeHtml(docs.authHeader)}</code></pre>
    </article>
  `;
};

const renderModules = (modules) => {
  elements.moduleList.innerHTML = modules
    .map(
      (module) => `
        <article class="module-card">
          <h3>${escapeHtml(module.title)}</h3>
          <p>${module.endpoints.length} endpoint${module.endpoints.length === 1 ? "" : "s"}</p>
          <div class="doc-list">
            ${module.endpoints
              .map(
                (endpoint) => `
                  <button
                    type="button"
                    class="doc-line endpoint-link"
                    data-target="${escapeHtml(getTesterId(endpoint))}"
                    aria-label="Open ${escapeHtml(endpoint.name)} tester"
                  >
                    <strong>${escapeHtml(endpoint.name)}</strong>
                    <span class="directory-method method-${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
};

const renderTesterCards = (endpoints) => {
  elements.testerList.innerHTML = endpoints
    .map(
      (endpoint) => `
        ${(() => {
          const shouldShowPayloadEditor =
            endpoint.hasBody && endpoint.requestBody?.fields?.length;

          return `
        <article class="tester" id="${escapeHtml(getTesterId(endpoint))}" data-endpoint-card="${escapeHtml(endpoint.id)}">
          <div class="tester-head">
            <div class="tester-title">
              <h3>${escapeHtml(endpoint.name)}</h3>
              <div class="route-copy-row">
                <button
                  type="button"
                  class="copy-pill"
                  data-copy-text="${escapeHtml(endpoint.path)}"
                  data-copy-label="Path"
                  aria-label="Copy path ${escapeHtml(endpoint.path)}"
                  title="Copy endpoint path"
                >
                  <span class="copy-pill-label">Path</span>
                  <code>${escapeHtml(endpoint.path)}</code>
                  <span class="copy-pill-status" data-copy-status>Copy</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              class="copy-pill copy-pill-method method-${escapeHtml(endpoint.method.toLowerCase())}"
              data-copy-text="${escapeHtml(endpoint.method)}"
              data-copy-label="Method"
              aria-label="Copy method ${escapeHtml(endpoint.method)}"
              title="Copy method"
            >
              <span class="copy-pill-label">Method</span>
              <strong>${escapeHtml(endpoint.method)}</strong>
              <span class="copy-pill-status" data-copy-status>Copy</span>
            </button>
          </div>
          <div class="tester-body">
            <div class="doc-list">
              <div class="doc-line"><strong>Module:</strong> ${escapeHtml(endpoint.module)}</div>
              <div class="doc-line"><strong>Authentication:</strong> ${endpoint.authRequired ? "Required" : "None"}</div>
              <div class="doc-line"><strong>Description:</strong> ${escapeHtml(endpoint.description)}</div>
              ${
                endpoint.requestBody?.fields?.length
                  ? `
                    <div class="doc-line">
                      <strong>Request fields:</strong>
                      ${endpoint.requestBody.fields
                        .map(
                          (field) =>
                            `<code>${escapeHtml(field.name)}</code> (${escapeHtml(field.type)}${field.required ? ", required" : ""})`,
                        )
                        .join(", ")}
                    </div>
                  `
                  : ""
              }
            </div>
            ${
              endpoint.hasBody
                ? `
                  <div class="stack">
                    <div>
                      <label for="${escapeHtml(`${endpoint.id}-body`)}">${escapeHtml(endpoint.bodyLabel || "JSON body")}</label>
                      <textarea id="${escapeHtml(`${endpoint.id}-body`)}">${escapeHtml(prettyJson(endpoint.exampleBody || {}))}</textarea>
                    </div>
                  </div>
                `
                : ""
            }
            <div class="actions">
              <button
                type="button"
                data-endpoint="${escapeHtml(endpoint.path)}"
                data-method="${escapeHtml(endpoint.method)}"
                ${
                  shouldShowPayloadEditor
                    ? `data-body-id="${escapeHtml(`${endpoint.id}-body`)}"`
                    : ""
                }
                ${endpoint.authRequired ? 'data-auth="true"' : ""}
              >Send Request</button>
            </div>
            <div class="inline-response">
              <p data-response-status>No request sent yet.</p>
              <pre data-response-output>Waiting for a request...</pre>
            </div>
          </div>
        </article>
          `;
        })()}
      `,
    )
    .join("");
};

const openTester = (targetId, shouldScroll = false) => {
  const testerCards = Array.from(document.querySelectorAll(".tester"));
  const moduleLinks = Array.from(
    document.querySelectorAll(".module-card .endpoint-link"),
  );

  testerCards.forEach((card) => {
    const isTarget = card.id === targetId;
    card.classList.toggle("active", isTarget);
    card.classList.toggle("hidden", !isTarget);
  });

  moduleLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.target === targetId);
  });

  if (shouldScroll) {
    const targetCard = document.getElementById(targetId);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
};

const renderResponse = (container, status, statusText, payload, ok) => {
  const responseStatus = container.querySelector("[data-response-status]");
  const responseOutput = container.querySelector("[data-response-output]");

  responseStatus.textContent = `${status} ${statusText}`;
  responseStatus.className = ok ? "status-ok" : "status-error";
  responseOutput.textContent =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
};

const sendRequest = async ({
  button,
  endpoint,
  method,
  bodyId,
  requiresAuth,
}) => {
  const container = button.closest(".tester");
  const normalizedEndpoint = normalizeEndpointPath(endpoint);
  const headers = {};
  const options = { method, headers };
  let requestPayload = null;

  if (bodyId) {
    headers["Content-Type"] = "application/json";

    try {
      requestPayload = JSON.parse(document.getElementById(bodyId).value);
      options.body = JSON.stringify(requestPayload);
    } catch (error) {
      renderResponse(
        container,
        0,
        "Invalid JSON",
        { message: error.message },
        false,
      );
      return;
    }
  }

  if (requiresAuth) {
    const token = elements.tokenInput.value.trim();

    if (!token) {
      renderResponse(
        container,
        0,
        "Missing Token",
        { message: "Enter a JWT token first." },
        false,
      );
      return;
    }

    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const text = await response.text();
    let payload = text;

    try {
      payload = JSON.parse(text);
    } catch (error) {
      // Keep raw text if response is not JSON.
    }

    if (payload && payload.token) {
      elements.tokenInput.value = payload.token;
    }

    if (
      response.ok &&
      (normalizedEndpoint === "/api/auth/login" ||
        normalizedEndpoint === "/api/auth/register")
    ) {
      syncAuthMetadata({
        fullname: payload?.user?.fullname || requestPayload?.fullname,
        email: payload?.user?.email || requestPayload?.email,
        password: requestPayload?.password,
      });
    }

    if (
      response.ok &&
      normalizedEndpoint === "/api/profile" &&
      method === "PATCH"
    ) {
      const latestFullname =
        payload?.user?.fullname || requestPayload?.fullname;
      const latestEmail = payload?.user?.email || requestPayload?.email;

      syncProfileMetadata({
        fullname: latestFullname,
        email: latestEmail,
      });

      // Keep auth tester payloads aligned with profile email/fullname changes.
      syncAuthMetadata({
        fullname: latestFullname,
        email: latestEmail,
      });
    }

    if (
      response.ok &&
      normalizedEndpoint === "/api/profile/password" &&
      method === "PATCH"
    ) {
      const latestPassword = requestPayload?.newPassword;

      syncProfileMetadata({
        password: latestPassword,
      });

      // Keep auth tester payloads aligned with profile password changes.
      syncAuthMetadata({
        password: latestPassword,
      });
    }

    if (response.ok && normalizedEndpoint === "/api/auth/logout") {
      elements.tokenInput.value = "";
    }

    renderResponse(
      container,
      response.status,
      response.statusText,
      payload,
      response.ok,
    );
  } catch (error) {
    renderResponse(
      container,
      0,
      "Request Failed",
      { message: error.message },
      false,
    );
  }
};

const attachEventHandlers = (defaultOpenId) => {
  document.querySelectorAll("textarea").forEach((textarea) => {
    textarea.addEventListener("input", () => {
      resizeTextarea(textarea);
    });
    resizeTextarea(textarea);
  });

  document.querySelectorAll("button[data-endpoint]").forEach((button) => {
    button.addEventListener("click", () => {
      sendRequest({
        button,
        endpoint: button.dataset.endpoint,
        method: button.dataset.method,
        bodyId: button.dataset.bodyId,
        requiresAuth: button.dataset.auth === "true",
      });
    });
  });

  document.querySelectorAll(".endpoint-link").forEach((button) => {
    button.addEventListener("click", () => {
      openTester(button.dataset.target, true);
    });
  });

  document.querySelectorAll("button[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      const copied = await copyTextValue(button.dataset.copyText || "");
      const label = button.dataset.copyLabel || "Value";
      setInlineCopyButtonState(
        button,
        copied ? `${label} copied` : "Copy failed",
      );
    });
  });

  if (defaultOpenId) {
    openTester(defaultOpenId, false);
  }
};

const renderDocs = (docs) => {
  docsState = docs;
  elements.pageTitle.textContent = docs.title;
  elements.heroTitle.textContent = docs.subtitle;
  elements.heroDescription.textContent = docs.description;
  elements.authBadge.textContent = "Bearer JWT";
  elements.formatBadge.textContent = docs.contentType;
  elements.authHeaderPreview.textContent = docs.authHeader;

  renderMetrics(docs.endpoints);
  renderReference(docs);
  renderModules(docs.modules);
  renderTesterCards(docs.endpoints);
  attachEventHandlers(docs.defaultOpen ? `${docs.defaultOpen}-tester` : null);
};

const renderFallback = (message) => {
  elements.heroDescription.textContent = message;
  elements.heroMetrics.innerHTML = `
    <div class="metric">
      <strong>0</strong>
      <p>Endpoints loaded.</p>
    </div>
    <div class="metric">
      <strong>0</strong>
      <p>Modules loaded.</p>
    </div>
    <div class="metric">
      <strong>1</strong>
      <p>Check the docs endpoint.</p>
    </div>
  `;

  const content = `<div class="loading-note">${escapeHtml(message)}</div>`;
  elements.referenceGrid.innerHTML = content;
  elements.moduleList.innerHTML = content;
  elements.testerList.innerHTML = content;
};

const loadDocs = async () => {
  try {
    const injectedPayload = window.__API_DOCS__;

    if (injectedPayload?.endpoints) {
      renderDocs(injectedPayload);
      return;
    }

    const response = await fetch(`${baseUrl}/api/docs`);
    const payload = await response.json();

    if (!response.ok || !payload?.endpoints) {
      throw new Error(payload?.message || "Unable to load API documentation.");
    }

    renderDocs(payload);
  } catch (error) {
    renderFallback(error.message || "Unable to load API documentation.");
  }
};

elements.clearTokenButton.addEventListener("click", () => {
  elements.tokenInput.value = "";
});

elements.copyTokenButton.addEventListener("click", () => {
  copyTokenToClipboard();
});

elements.copyBaseUrlButton?.addEventListener("click", () => {
  copyBaseUrlToClipboard();
});

loadDocs();
