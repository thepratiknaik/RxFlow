/**
 * Format a raw digit string into (xxx) xxx-xxxx
 */
export const formatPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

/**
 * Handle phone input change — strips non-digits and reformats on the fly.
 */
export const handlePhoneChange = (e, setter) => {
  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
  setter(formatPhone(raw));
};

/**
 * Format a zip code as xxxxx or xxxxx-xxxx
 */
export const formatZip = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
};

/**
 * Handle zip input change — only allows digits and auto-inserts hyphen.
 */
export const handleZipChange = (e, setter) => {
  const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
  setter(formatZip(raw));
};

/**
 * Render city, state, zip as a single string: "New York, NY 10001"
 */
export const formatCityStateZip = (city, state, zip) => {
  const cityState = [city, state].filter(Boolean).join(", ");
  const formattedZip = zip ? formatZip(zip) : "";
  return [cityState, formattedZip].filter(Boolean).join(" ") || "—";
};

/**
 * Render a full one-line address.
 */
export const formatAddress = (line1, line2, city, state, zip) => {
  const street = [line1, line2].filter(Boolean).join(", ");
  const locality = formatCityStateZip(city, state, zip);
  return [street, locality].filter(Boolean).join(", ") || "—";
};

/**
 * Normalise email to lowercase.
 */
export const formatEmail = (value) => String(value || "").trim().toLowerCase();
