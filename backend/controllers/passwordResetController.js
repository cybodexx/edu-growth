
const crypto = require("crypto");

const Student = require("../models/Student");
const PasswordReset = require("../models/PasswordReset");
const sendEmail = require("../services/emailService");

// Accepts a roll number OR an email, so both the analyst dashboards (which
// identify students by roll number) and the email-based flow keep working.
const forgotPassword = async (req, res, next) => {
  try {
    const body = req.body || {};

    const rawIdentifier =
      body.email ?? body.roll_no ?? body.rollNo ?? body.identifier;

    const identifier =
      typeof rawIdentifier === "string" ? rawIdentifier.trim() : "";

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "A roll number or email is required",
      });
    }

    const isEmail = identifier.includes("@");

    const student = isEmail
      ? await Student.findOne({ email: identifier.toLowerCase() })
      : await Student.findOne({ roll_no: identifier });

    const response = {
      success: true,
      message:
        "If an account exists, a password reset link will be sent.",
    };

    if (!student) {
      console.log("Forgot password: student account not found.");
      return res.status(200).json(response);
    }

    // Accounts imported from the roster have no email address, so there is
    // nothing to send to. Respond generically without revealing that.
    if (!student.email) {
      console.log("Forgot password: student has no email on file.");
      return res.status(200).json(response);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await PasswordReset.deleteMany({ userId: student._id });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.create({
      userId: student._id,
      token: hashedToken,
      expiresAt,
    });

    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:3000";

    const resetUrl =
      `${frontendUrl}/reset-password?token=${resetToken}`;

    console.log(
      "Attempting to send password reset email to:",
      student.email
    );

    try {
      const info = await sendEmail({
        to: student.email,
        subject: "EduGrowth Password Reset",
        text: `Use this link to reset your password. It expires in 15 minutes:\n${resetUrl}`,
        html: `
          <h2>EduGrowth Password Reset</h2>
          <p>You requested a password reset.</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>This link expires in 15 minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });

      console.log("Password reset email sent successfully.");
      console.log("Email message ID:", info.messageId);
      console.log("Accepted recipients:", info.accepted);
      console.log("Rejected recipients:", info.rejected);
    } catch (emailError) {
      console.error(
        "Password reset email failed:",
        emailError.message
      );
      console.log("Email sending failed; check the error above.");

      await PasswordReset.deleteMany({ userId: student._id });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Forgot password controller error:", error.message);
    next(error);
  }
};


const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the token received from the user
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find the matching, unexpired reset request
    const passwordReset = await PasswordReset.findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() },
    });

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired password reset token",
      });
    }

    const student = await Student.findById(passwordReset.userId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Hash the new password before saving
    const bcrypt = require("bcryptjs");
    student.password = await bcrypt.hash(newPassword, 10);
    await student.save();

    // Make the reset token unusable after successful reset
    await PasswordReset.deleteMany({ userId: student._id });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { forgotPassword, resetPassword };