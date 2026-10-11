const RevokedToken = require("../models/RevokedToken");

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // Decode token to get its expiry time
    const decoded = require("jsonwebtoken").decode(token);

    if (!decoded || !decoded.exp) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const expiresAt = new Date(decoded.exp * 1000);

    // Save the token only if it has not expired
    if (expiresAt <= new Date()) {
      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    }

    await RevokedToken.findOneAndUpdate(
      { token },
      { token, expiresAt },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = { logout };
