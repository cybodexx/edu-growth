const express = require("express");

const router = express.Router();

const {
  registerStudent,
  loginStudent,
  getStudentProfile,
} = require("../controllers/studentController");

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/passwordResetController");

const { logout } = require("../controllers/logoutController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Student Signup
router.post("/register", registerStudent);

// Student Login
router.post("/login", loginStudent);

// Forgot Password
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

// Student Profile
router.get(
  "/profile",
  protect,
  authorizeRoles("student"),
  getStudentProfile
);

// Student Logout
router.post(
  "/logout",
  protect,
  authorizeRoles("student"),
  logout
);

module.exports = router;
