const crypto = require("crypto");

const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

const PASSWORD_SUFFIX = "@123";
const MAX_ROLL_NO_LENGTH = 30;
const MAX_PASSWORD_LENGTH = 256;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;

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

// Pick the first defined value from a list of aliases.
const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

// Basic email sanity check (the DB stores lowercase).
const looksLikeEmail = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
//
// Accepts the dashboard payload ({ roll_no, name, password, class_section })
// as well as the legacy email flow ({ name, email, password }). At least one
// of roll_no / email is required so the account can be identified at login.
const registerStudent = async (req, res, next) => {
  try {
    const body = req.body || {};

    const rawName = body.name;
    const rawRollNo = firstDefined(body.roll_no, body.rollNo);
    const rawEmail = body.email;
    const password = body.password;
    const rawSection = firstDefined(body.class_section, body.section);

    const name = typeof rawName === "string" ? rawName.trim() : "";
    const rollNo = normalizeRollNo(rawRollNo);
    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const classSection =
      typeof rawSection === "string" ? rawSection.trim() : "";

    if (!name || name.length > MAX_NAME_LENGTH) {
      throw createHttpError(400, "Please provide a valid name");
    }

    if (typeof password !== "string" || !password) {
      throw createHttpError(400, "Please provide a password");
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      throw createHttpError(400, "Password is too long");
    }

    if (!rollNo && !email) {
      throw createHttpError(
        400,
        "Please provide a roll number or an email address"
      );
    }

    if (rollNo !== null && (rollNo.length === 0 || rollNo.length > MAX_ROLL_NO_LENGTH)) {
      throw createHttpError(400, "Please provide a valid roll number");
    }

    if (email && (!looksLikeEmail(email) || email.length > MAX_EMAIL_LENGTH)) {
      throw createHttpError(400, "Please provide a valid email address");
    }

    // Reject duplicates up-front for a clear message (the unique indexes are
    // still the final guard and are handled below).
    if (email) {
      const existingByEmail = await Student.findOne({ email });

      if (existingByEmail) {
        throw createHttpError(
          409,
          "Student already exists with this email"
        );
      }
    }

    if (rollNo) {
      const existingByRoll = await Student.findOne({ roll_no: rollNo });

      if (existingByRoll) {
        throw createHttpError(
          409,
          "Student already exists with this roll number"
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      name,
      password: hashedPassword,
      ...(rollNo ? { roll_no: rollNo } : {}),
      ...(email ? { email } : {}),
      ...(classSection ? { class_section: classSection } : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      student: {
        id: student._id,
        roll_no: student.roll_no,
        name: student.name,
        email: student.email,
        class_section: student.class_section,
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

// Student Login.
//
// Self-registered students present the password they chose (stored as a bcrypt
// hash). Roster students imported from the roll-number CSV have no stored
// password: their password is derived from their name as "<name>@123".
const loginStudent = async (req, res, next) => {
  try {
    const body = req.body || {};

    // Accept roll_no, rollNo, email or identifier.
    const rawIdentifier = firstDefined(
      body.roll_no,
      body.rollNo,
      body.email,
      body.identifier
    );

    const password = body.password;

    if (
      rawIdentifier === undefined ||
      rawIdentifier === null ||
      rawIdentifier === "" ||
      password === undefined ||
      password === null ||
      password === ""
    ) {
      throw createHttpError(
        400,
        "Please provide roll number and password"
      );
    }

    const identifier = normalizeRollNo(rawIdentifier);

    if (
      identifier === null ||
      identifier.length === 0 ||
      identifier.length > MAX_ROLL_NO_LENGTH ||
      typeof password !== "string" ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      throw createHttpError(
        400,
        "Invalid roll number or password format"
      );
    }

    // Find by roll number, or by email when the identifier looks like one.
    const query = looksLikeEmail(identifier)
      ? { email: identifier.toLowerCase() }
      : { roll_no: identifier };

    const matches = await Student.find(query)
      .select("name email roll_no class_section password")
      .limit(2)
      .lean();

    if (matches.length > 1) {
      console.error(
        "Login blocked: duplicate student records found."
      );

      throw createHttpError(
        500,
        "Login failed. Please contact the administrator."
      );
    }

    const student = matches[0] || null;

    // Verify the password: bcrypt for stored hashes, otherwise the derived
    // "<name>@123" password used by the roster import.
    let passwordCorrect = false;

    if (student && typeof student.password === "string" && student.password) {
      try {
        passwordCorrect = await bcrypt.compare(password, student.password);
      } catch {
        passwordCorrect = false;
      }
    }

    if (!passwordCorrect && student) {
      const storedName =
        typeof student.name === "string" ? student.name.trim() : "";

      if (storedName) {
        passwordCorrect = equalsIgnoreCase(
          password,
          `${storedName}${PASSWORD_SUFFIX}`
        );
      }
    }

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
      class_section: student.class_section || "",
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
        class_section: req.user.class_section,
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
