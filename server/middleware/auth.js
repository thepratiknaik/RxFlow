import jwt from "jsonwebtoken";
import { normalizeRole } from "../services/schemaCompatService.js";

export const verifyToken = (req, res, next) => {
  // Get token from headers
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided, authorization denied",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    const normalizedUserRole = normalizeRole(req.user?.role);
    const normalizedRoles = roles.map((role) => normalizeRole(role));

    if (!normalizedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied, insufficient permissions",
      });
    }

    req.user.role = normalizedUserRole;
    next();
  };
};

/** Only the pharmacist role may proceed (not admin or technician). */
export const authorizePharmacistOnly = (req, res, next) => {
  if (normalizeRole(req.user?.role) !== "pharmacist") {
    return res.status(403).json({
      success: false,
      message: "Only pharmacists may perform this action.",
    });
  }
  next();
};
