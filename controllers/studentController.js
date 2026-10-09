const Student = require("../models/Student");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// Student Signup
const registerStudent = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.statusCode = 400;
      throw new Error("Please provide name, email and password");
    }

    const existingStudent = await Student.findOne({ email });

    if (existingStudent) {
      res.statusCode = 409;
      throw new Error("Student already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Student Login
const loginStudent = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      throw new Error("Please provide email and password");
    }

    const student = await Student.findOne({ email });

    if (!student) {
      res.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      student.password
    );

    if (!isPasswordCorrect) {
      res.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    const token = generateToken(student._id.toString(), "student");

    res.status(200).json({
      success: true,
      message: "Student login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
    });
  } catch (error) {
    next(error);
  }
};


const getStudentProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Student profile fetched successfully",
      student: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getStudentProfile,
};