import AuditLog from "../models/AuditLog.js";
import { getDefaultPharmacyId } from "./schemaCompatService.js";

const truncate = (value, max = 2000) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const sanitize = (value, depth = 0) => {
  if (value == null) {
    return value;
  }

  if (depth > 4) {
    return "[Max depth reached]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => sanitize(item, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => typeof nestedValue !== "function")
        .slice(0, 50)
        .map(([key, nestedValue]) => [key, sanitize(nestedValue, depth + 1)]),
    );
  }

  if (typeof value === "string") {
    return truncate(value, 500);
  }

  return value;
};

export const writeAuditLog = async ({
  entityType,
  entityId = null,
  action,
  summary,
  metadata = null,
  actorUserId = null,
  actorRole = null,
}) => {
  try {
    const normalizedAction = String(action || "")
      .trim()
      .toLowerCase();
    const normalizedEntityType = String(entityType || "")
      .trim()
      .toLowerCase();
    const actionType = normalizedAction.includes("delete")
      ? "DELETE"
      : normalizedAction.includes("update")
        ? "UPDATE"
        : "CREATE";
    const auditType =
      normalizedEntityType === "patient"
        ? "patient"
        : normalizedEntityType === "drug"
          ? "drug_pull"
          : "general";

    await AuditLog.create({
      pharmacyId: await getDefaultPharmacyId(),
      userId: actorUserId || 1,
      actionType,
      auditType,
      entityTable: String(entityType || "").trim(),
      entityId:
        entityId != null && Number.isFinite(Number(entityId))
          ? Number(entityId)
          : 0,
      changes: sanitize({
        summary: truncate(summary || `${entityType} ${action}`),
        action: String(action || "").trim(),
        actorRole: actorRole ? String(actorRole).trim() : null,
        metadata: metadata ? sanitize(metadata) : null,
      }),
    });
  } catch (error) {
    console.error("Global audit logging error:", error);
  }
};

export const buildActorContext = (req) => ({
  actorUserId: req.user?.id || null,
  actorRole: req.user?.role || null,
});
