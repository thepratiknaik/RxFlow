import Pharmacy from "../models/Pharmacy.js";
import User from "../models/User.js";

export const getPharmacy = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const pharmacy = await Pharmacy.findByPk(user.pharmacyId);
    if (!pharmacy) {
      return res
        .status(404)
        .json({ success: false, message: "Pharmacy not found." });
    }

    return res.status(200).json({ success: true, data: pharmacy });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to get pharmacy.",
      });
  }
};

export const updatePharmacy = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const pharmacy = await Pharmacy.findByPk(user.pharmacyId);
    if (!pharmacy) {
      return res
        .status(404)
        .json({ success: false, message: "Pharmacy not found." });
    }

    const updates = {};
    if (req.body.name !== undefined)
      updates.name = String(req.body.name).trim();
    if (req.body.licenseNumber !== undefined)
      updates.licenseNumber = String(req.body.licenseNumber).trim();

    if (!Object.keys(updates).length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Provide at least one of: name, licenseNumber.",
        });
    }

    await pharmacy.update(updates);
    return res
      .status(200)
      .json({
        success: true,
        message: "Pharmacy updated successfully.",
        data: pharmacy,
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Failed to update pharmacy.",
      });
  }
};

export const setupPharmacyOnboarding = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const name = String(req.body?.name || "").trim();
    const licenseNumber = String(req.body?.licenseNumber || "").trim();

    if (!name || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: "name and licenseNumber are required.",
      });
    }

    const existing = await Pharmacy.findOne({ where: { licenseNumber } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A pharmacy with this license number already exists.",
      });
    }

    const pharmacy = await Pharmacy.create({
      name,
      licenseNumber,
      subscriptionTier: "Starter",
      statusId: 1,
    });

    user.pharmacyId = pharmacy.id;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Pharmacy created and linked to your account.",
      data: pharmacy,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to setup pharmacy.",
    });
  }
};
