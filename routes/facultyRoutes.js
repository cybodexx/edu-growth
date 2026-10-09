const express = require("express");

const router = express.Router();

const {
  registerFaculty,
  loginFaculty,
  getFacultyProfile,
} = require("../controllers/facultyController");

const { logout } = require("../controllers/logoutController");

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Faculty Signup
router.post("/register", registerFaculty);

// Faculty Login
router.post("/login", loginFaculty);

// Faculty Profile (Protected API)
router.get(
  "/profile",
  protect,
  authorizeRoles("faculty"),
  getFacultyProfile
);

// Faculty Logout
router.post(
  "/logout",
  protect,
  authorizeRoles("faculty"),
  logout
);

module.exports = router;
