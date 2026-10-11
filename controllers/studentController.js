const crypto = require("crypto");

const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

const PASSWORD_SUFFIX = "@123";
const MAX_ROLL_NO_LENGTH = 30;
const MAX_PASSWORD_LENGTH = 256;

// Create HTTP errors compatible with error middleware.
const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Normalize roll number without converting arbitrary objects to strings.
const normalizeRollNo = (value) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0
      ? String(value)
      : null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return null;
};

// Hash strings before constant-time comparison.
const digestForComparison = (value) =>
  crypto
    .createHash("sha256")
    .update(value.normalize("NFC").toLowerCase())
    .digest();

const equalsIgnoreCase = (a, b) =>
  crypto.timingSafeEqual(
    digestForComparison(a),
    digestForComparison(b)
  );

// Student Signup
const registerStudent = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      throw createHttpError(
        400,
        "Please provide name, email and password"
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingStudent = await Student.findOne({
      email: normalizedEmail,
    });

    if (existingStudent) {
      throw createHttpError(
        409,
        "Student already exists with this email"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        createHttpError(
          409,
          "A student with these details already exists"
        )
      );
    }

    return next(error);
  }
};

// Student Login: roll number + <stored student name>@123
const loginStudent = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Accept both roll_no and rollNo.
    const rawRollNo =
      body.roll_no !== undefined
        ? body.roll_no
        : body.rollNo;

    const password = body.password;

    if (
      rawRollNo === undefined ||
      rawRollNo === null ||
      rawRollNo === "" ||
      password === undefined ||
      password === null ||
      password === ""
    ) {
      throw createHttpError(
        400,
        "Please provide roll number and password"
      );
    }

    const rollNo = normalizeRollNo(rawRollNo);

    if (
      rollNo === null ||
      rollNo.length === 0 ||
      rollNo.length > MAX_ROLL_NO_LENGTH ||
      typeof password !== "string" ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      throw createHttpError(
        400,
        "Invalid roll number or password format"
      );
    }

    // Find the student using the exact roll number.
    const matches = await Student.find({
      roll_no: rollNo,
    })
      .select("name email roll_no")
      .limit(2)
      .lean();

    if (matches.length > 1) {
      console.error(
        "Login blocked: duplicate student roll numbers found."
      );

      throw createHttpError(
        500,
        "Login failed. Please contact the administrator."
      );
    }

    const student = matches[0] || null;

    const storedName =
      student && typeof student.name === "string"
        ? student.name.trim()
        : "";

    // Use a dummy expected value for unknown or invalid records.
    const expectedPassword = storedName
      ? `${storedName}${PASSWORD_SUFFIX}`
      : "\u0000invalid";

    const passwordCorrect =
      typeof password === "string" &&
      Boolean(storedName) &&
      equalsIgnoreCase(password, expectedPassword);

    if (!student || !passwordCorrect) {
      throw createHttpError(
        401,
        "Invalid roll number or password"
      );
    }

    // Generate the existing application's student JWT.
    const token = generateToken(
      student._id.toString(),
      "student"
    );

    const studentResponse = {
      id: student._id,
      roll_no: student.roll_no,
      name: student.name,
    };

    if (student.email) {
      studentResponse.email = student.email;
    }

    return res.status(200).json({
      success: true,
      message: "Student login successful",
      token,
      student: studentResponse,
    });
  } catch (error) {
    if (error.statusCode) {
      return next(error);
    }

    console.error(
      "Student login error:",
      error.stack || error
    );

    return next(
      createHttpError(
        500,
        "Login failed. Please try again later."
      )
    );
  }
};

// Get the authenticated student's profile.
const getStudentProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      throw createHttpError(
        401,
        "Authentication required"
      );
    }

    return res.status(200).json({
      success: true,
      message: "Student profile fetched successfully",
      student: {
        id: req.user._id,
        roll_no: req.user.roll_no,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getStudentProfile,
};