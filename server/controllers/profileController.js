import User from "../models/User.js";

// @desc    Update current user's profile
// @route   PATCH /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { fullname, email } = req.body;

    if (!fullname && !email) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required: fullname or email",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && email !== user.email) {
      const emailInUse = await User.findOne({ where: { email } });

      if (emailInUse) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      user.email = email;
    }

    if (fullname) {
      user.fullname = fullname;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        isactive: user.isactive,
        lastlogin: user.lastlogin,
        createdat: user.createdat,
        updatedat: user.updatedat,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating profile",
    });
  }
};

// @desc    Change current user's password
// @route   PATCH /api/profile/password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "currentPassword, newPassword, and confirmPassword are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await user.matchPassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error changing password",
    });
  }
};
