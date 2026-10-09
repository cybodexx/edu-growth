const jwt = require("jsonwebtoken");

const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const RevokedToken = require("../models/RevokedToken");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // Check whether token has been revoked after logout
    const revokedToken = await RevokedToken.findOne({ token });

    if (revokedToken) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await Student.findById(decoded.id).select("-password");
    let role = "student";

    if (!user) {
      user = await Faculty.findById(decoded.id).select("-password");
      role = "faculty";
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    req.userRole = role;

    return next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.stack || error);

    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Token expired"
          : error.name === "JsonWebTokenError"
          ? "Invalid token"
          : error.message || "Authentication failed",
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};

module.exports = { protect, authorizeRoles };
