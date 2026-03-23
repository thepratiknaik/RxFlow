const OPEN_FDA_NDC_URL = "https://api.fda.gov/drug/ndc.json";

import Drug from "../models/Drug.js";

const sanitizeSearchToken = (value) =>
  String(value || "")
    .trim()
    .replace(/[+\-!(){}\[\]^"~?:\\/]|&&|\|\|/g, " ")
    .replace(/\s+/g, " ");

const normalizeFirst = (value) => {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const buildSearchQuery = (searchTerm) => {
  if (!searchTerm) {
    return "";
  }

  const escaped = sanitizeSearchToken(searchTerm);
  if (!escaped) {
    return "";
  }

  if (escaped.includes(" ")) {
    return `(brand_name:"${escaped}" OR generic_name:"${escaped}")`;
  }

  return `(brand_name:${escaped}* OR generic_name:${escaped}*)`;
};

const createOpenFdaError = ({ payload, response, url }) => {
  const status = response?.status || 500;
  const apiMessage = payload?.error?.message || "Failed to fetch data from openFDA.";
  const details = payload?.error?.details
    ? String(payload.error.details).replace(/\s+/g, " ").trim()
    : null;

  const messageParts = [`openFDA request failed (${status}): ${apiMessage}`];

  if (details) {
    messageParts.push(`Details: ${details}`);
  }

  if (url) {
    messageParts.push(`URL: ${url}`);
  }

  const error = new Error(messageParts.join(" "));
  error.name = "OpenFdaRequestError";
  error.status = status;
  error.details = details;
  error.requestUrl = url;

  return error;
};

export const fetchDrugsFromOpenFda = async ({
  searchTerm = "",
  limit = 25,
}) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const query = buildSearchQuery(searchTerm);

  const url = new URL(OPEN_FDA_NDC_URL);
  url.searchParams.set("limit", String(normalizedLimit));

  if (query) {
    url.search += `&search=${encodeURIComponent(query)}`;
  }

  const response = await fetch(url.toString());
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw createOpenFdaError({
      payload,
      response,
      url: url.toString(),
    });
  }

  const normalizedResults = (payload?.results || [])
    .map((item) => ({
      productndc: item.product_ndc,
      genericname: item.generic_name || null,
      brandname: item.brand_name || null,
      labelername: item.labeler_name || null,
      dosageform: item.dosage_form || null,
      route: normalizeFirst(item.route),
      producttype: item.product_type || null,
      activesubstances: item.active_ingredients || [],
      packaging: item.packaging || [],
      source: "openfda",
    }))
    .filter((item) => item.productndc);

  return {
    total: payload?.meta?.results?.total || normalizedResults.length,
    results: normalizedResults,
  };
};

export const pullAndUpsertDrugs = async ({ searchTerm = "", limit = 25 }) => {
  const { results, total } = await fetchDrugsFromOpenFda({ searchTerm, limit });

  let inserted = 0;
  let updated = 0;

  for (const drug of results) {
    const existing = await Drug.findOne({
      where: { productndc: drug.productndc },
    });

    if (existing) {
      await existing.update(drug);
      updated += 1;
    } else {
      await Drug.create(drug);
      inserted += 1;
    }
  }

  return {
    searchTerm,
    sourceTotalMatches: total,
    pulled: results.length,
    inserted,
    updated,
  };
};
