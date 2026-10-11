const express = require("express");
require("dotenv").config();

// DNS configuration for MongoDB Atlas
require("dns").setServers(["8.8.8.8"]);

const connectDB = require("./config/db");
const errorMiddleware = require("./middleware/errorMiddleware");
const { protect } = require("./middleware/authMiddleware");

const studentRoutes = require("./routes/studentRoutes");
const facultyRoutes = require("./routes/facultyRoutes");

const app = express();

// Port Configuration
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Request logging middleware — temporary debugging
app.use((req, res, next) => {
  console.log("\n========== INCOMING REQUEST ==========");
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Content-Type:", req.headers["content-type"]);

  // Do not log passwords, tokens, or other sensitive request data.
  next();
});

// Student Routes
app.use("/api/students", studentRoutes);

// Faculty Routes
app.use("/api/faculty", facultyRoutes);

// Public Test Route
app.get("/", (req, res) => {
  console.log("PUBLIC TEST ROUTE HIT");

  res.status(200).json({
    success: true,
    message: "EduGrowth Backend is running!",
  });
});

// Protected Test Route
app.get("/api/protected", protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: req.user,
    role: req.userRole,
  });
});

// 404 Route Handler
app.use((req, res) => {
  console.log("404 ROUTE HIT:", req.method, req.originalUrl);

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error Middleware — must be last
app.use(errorMiddleware);

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("------------------------------------");
      console.log("EduGrowth Backend Started");
      console.log(`Server running on port ${PORT}`);
      console.log("------------------------------------");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();