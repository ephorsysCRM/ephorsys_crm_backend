import AdminModel from "../models/admin.model.js";
import generateToken from "../utils/generateToken.js";
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
      sameSite: "lax",
      secure: false, // true in production
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
