import jwt from "jsonwebtoken";
import AdminModel from "../models/admin.model.js";

const protect = async (req, res, next) => {
  try {
    // ---------------------------------------------
    // Get Token From Cookie
    // ---------------------------------------------
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized",
      });
    }

    // ----------------------------------------------
    // Verify Token
    // ----------------------------------------------
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // ----------------------------------------------
    // Find Admin
    // ----------------------------------------------
    req.admin = await AdminModel.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    return res.status(401).json({
      message: false,
      message: "Invalid Token",
    });
  }
};

export default protect;
