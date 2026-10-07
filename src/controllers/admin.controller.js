import crypto from "crypto";
import AdminModel from "../models/admin.model.js";
import generateToken from "../utils/generateToken.js";
import sendEmail from "../utils/sendEmail.js";
import { getPasswordResetEmail } from "../utils/emailTemplates.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalizeEmail = (email) => email?.toString().trim().toLowerCase();
const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");
const respond = (res, status, success, message, extra = {}) =>
  res.status(status).json({ success, message, ...extra });
// -----------------------------------------------------
// @description -   Register Admin
// @route -   POST /api/v1/admin/register
// @access -  Public
// -----------------------------------------------------

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All Feilds are Required",
      });
    }

    // --------------------------------------------
    // Check Existing Admin
    // --------------------------------------------
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin Already Exists",
      });
    }

    // --------------------------------------------
    // Create Admin
    // --------------------------------------------
    const admin = await AdminModel.create({
      name,
      email,
      password,
    });

    //---------------------------------------------
    // Remove Password from Response
    //---------------------------------------------
    const adminData = await AdminModel.findById(admin._id).select("-password");

    //---------------------------------------------
    // Final Response
    //----------------------------------------------
    return res.status(201).json({
      success: true,
      message: "Admin Registered Successfully",
      data: adminData,
    });
  } catch (error) {
    console.error("Register Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//-------------------------------------------------------
//@description - Login Admin
//@route - POST  /api/v1/admin/login
//@access Public
//-------------------------------------------------------

export const loginAdmin = async (req, res) => {
  try {
    // --------------------------------------------
    // Get Email & Password
    // --------------------------------------------
    const { email, password } = req.body;

    // --------------------------------------------
    // Validation
    // --------------------------------------------
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are Required",
      });
    }

    // --------------------------------------------
    // Find Admin already exist or Not
    // --------------------------------------------
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found",
      });
    }

    // ---------------------------------------------
    // Compare Password
    // ----------------------------------------------
    const isPasswordMatched = await admin.comparePassword(password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid Credentials",
      });
    }

    // ---------------------------------------------
    // Generate Token
    // ----------------------------------------------
    const token = generateToken(admin._id);

    // ---------------------------------------------
    // Cookie Options
    // ----------------------------------------------
    const cookieOption = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    // ---------------------------------------------
    // Store Token in Cookie
    // ----------------------------------------------
    res.cookie("token", token, cookieOption);

    // ---------------------------------------------
    // Login Response
    // ----------------------------------------------
    return res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login Admin Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//-------------------------------------------------------
//@description - Logout Admin
//@route - POST  /api/v1/admin/logout
//@access Private
//-------------------------------------------------------

export const LogoutAdmin = async (req, res) => {
  try {
    // ------------------------------------------
    // Clear Auth Cookie
    // ------------------------------------------

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none", // must match the options used when the cookie was set
      secure: true,
    });

    // ------------------------------------------
    // Success Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Logout Successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//-------------------------------------------------------
//@description - Get Admin Profile
//@route - GET /api/v1/admin/profile
//@access Private
//-------------------------------------------------------

export const getAdminProfile = async (req, res) => {
  try {
    // --------------------------------------------
    // Find Admin already exist or Not
    // --------------------------------------------
    const admin = await AdminModel.findById(req.admin._id).select("-password");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found",
      });
    }

    // ------------------------------------------
    // Success Response
    // ------------------------------------------
    return res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// -------------------------------------------------------
// @description - Update Admin Profile / Password
// @route       - PATCH /api/v1/admin/update
// @access      - Private (Admin)
// -------------------------------------------------------

// export const updateAdmin = async (req, res) => {
//   try {
//     const { name, email, newPassword, confirmPassword } = req.body;

//     const admin = await AdminModel.findById(req.admin._id);
//     if (!admin) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin Not Found",
//       });
//     }

//     // ------------------------------------------
//     // Update name / email if provided
//     // ------------------------------------------
//     if (name) admin.name = name;
//     if (email) admin.email = email;

//     // ------------------------------------------
//     // Password Update (no old-password check)
//     // ------------------------------------------
//     if (newPassword || confirmPassword) {
//       if (!newPassword || !confirmPassword) {
//         return res.status(400).json({
//           success: false,
//           message: "Both newPassword and confirmPassword are required",
//         });
//       }

//       if (/\s/.test(newPassword)) {
//         return res.status(400).json({
//           success: false,
//           message: "Password must not contain spaces",
//         });
//       }

//       if (newPassword !== confirmPassword) {
//         return res.status(400).json({
//           success: false,
//           message: "New password and confirm password do not match",
//         });
//       }

//       if (newPassword.length < 6) {
//         return res.status(400).json({
//           success: false,
//           message: "Password must be at least 6 characters long",
//         });
//       }

//       // The pre-save hook in AdminModel will hash this automatically
//       admin.password = newPassword;
//     }

//     await admin.save();

//     const updatedAdmin = await AdminModel.findById(admin._id).select(
//       "-password"
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Admin updated successfully",
//       data: updatedAdmin,
//     });
//   } catch (error) {
//     console.error("Update Admin Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

//-------------------------------------------------------
//@description - Forget Admin Password
//@route - POST /api/v1/admin/forget-password
//@access Public
//-------------------------------------------------------

export const forgetPasswordAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return respond(res, 400, false, "Email is Required");
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      // Always return 200 to prevent email enumeration
      return respond(res, 200, true, "If an admin exists with this email, a reset OTP has been sent");
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const emailContent = getPasswordResetEmail(otp);

    admin.passwordResetOtp = hashValue(otp);
    admin.passwordResetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    admin.passwordResetToken = undefined;
    admin.passwordResetTokenExpires = undefined;
    admin.passwordResetVerified = false;

    await admin.save({ validateBeforeSave: false });

    try {
      await sendEmail({
        to: admin.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });
    } catch (mailError) {
      // Rollback OTP fields if mail fails
      admin.passwordResetOtp = undefined;
      admin.passwordResetOtpExpires = undefined;
      admin.passwordResetVerified = false;
      await admin.save({ validateBeforeSave: false });

      console.error("Password Reset Mail Error:", mailError);
      return respond(res, 500, false, "Unable to send password reset email");
    }

    return respond(res, 200, true, "If an admin exists with this email, a reset OTP has been sent");
  } catch (error) {
    console.error("Forget Password Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Verify Admin Password Reset OTP
//@route - POST /api/v1/admin/verify-reset-otp
//@access Public
//-------------------------------------------------------

export const verifyResetOtpAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = req.body?.otp?.toString().trim();

    if (!email || !otp) {
      return respond(res, 400, false, "Email and OTP are Required");
    }

    const admin = await AdminModel.findOne({ email }).select(
      "+passwordResetOtp +passwordResetOtpExpires +passwordResetToken +passwordResetTokenExpires +passwordResetVerified",
    );

    if (
      !admin ||
      !admin.passwordResetOtp ||
      !admin.passwordResetOtpExpires ||
      admin.passwordResetOtpExpires < new Date() ||
      admin.passwordResetOtp !== hashValue(otp)
    ) {
      return respond(res, 400, false, "Invalid or expired OTP");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.passwordResetOtp = undefined;
    admin.passwordResetOtpExpires = undefined;
    admin.passwordResetToken = hashValue(resetToken);
    admin.passwordResetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    admin.passwordResetVerified = true;

    await admin.save({ validateBeforeSave: false });

    return respond(res, 200, true, "OTP verified successfully", {
      data: {
        resetToken,
        expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    console.error("Verify Reset OTP Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};

//-------------------------------------------------------
//@description - Reset Admin Password
//@route - POST /api/v1/admin/reset-password
//@access Public
//-------------------------------------------------------

export const resetPasswordAdmin = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const resetToken = req.body?.resetToken?.trim();
    const { password, confirmPassword } = req.body || {};

    if (!email || !resetToken || !password || !confirmPassword) {
      return respond(res, 400, false, "Email, reset token, password, and confirm password are Required");
    }

    if (password !== confirmPassword) {
      return respond(res, 400, false, "Password and confirm password do not match");
    }

    if (password.length < 8) {
      return respond(res, 400, false, "Password must be at least 8 characters");
    }

    const admin = await AdminModel.findOne({ email }).select(
      "+password +passwordResetToken +passwordResetTokenExpires +passwordResetVerified",
    );

    if (
      !admin ||
      !admin.passwordResetVerified ||
      !admin.passwordResetToken ||
      !admin.passwordResetTokenExpires ||
      admin.passwordResetTokenExpires < new Date() ||
      admin.passwordResetToken !== hashValue(resetToken)
    ) {
      return respond(res, 400, false, "Invalid or expired reset token");
    }

    admin.password = password;
    admin.passwordResetToken = undefined;
    admin.passwordResetTokenExpires = undefined;
    admin.passwordResetVerified = false;

    await admin.save();

    return respond(res, 200, true, "Password reset successfully");
  } catch (error) {
    console.error("Reset Password Error:", error);
    return respond(res, 500, false, "Internal Server Error", { error: error.message });
  }
};
