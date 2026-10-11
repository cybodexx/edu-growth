const Faculty = require("../models/Faculty");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

// Faculty Signup
const registerFaculty = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.statusCode = 400;
      throw new Error("Please provide name, email and password");
    }

    const existingFaculty = await Faculty.findOne({ email });

    if (existingFaculty) {
      res.statusCode = 409;
      throw new Error("Faculty already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const faculty = await Faculty.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Faculty registered successfully",
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Faculty Login
const loginFaculty = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      throw new Error("Please provide email and password");
    }

    const faculty = await Faculty.findOne({ email });

    if (!faculty) {
      res.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      faculty.password
    );

    if (!isPasswordCorrect) {
      res.statusCode = 401;
      throw new Error("Invalid email or password");
    }

    const token = generateToken(faculty._id.toString(), "faculty");

    res.status(200).json({
      success: true,
      message: "Faculty login successful",
      token,
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getFacultyProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Faculty profile fetched successfully",
      faculty: {
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
  registerFaculty,
  loginFaculty,
  getFacultyProfile,
}