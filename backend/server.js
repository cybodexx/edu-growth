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
// The frontend's VITE_AUTH_BASE_URL defaults to http://localhost:5001, so the
// auth service must listen on 5001 unless PORT is set explicitly.
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());

// CORS — the React app runs on a different origin (e.g. http://localhost:5173),
// so browser calls would otherwise be blocked. ALLOWED_ORIGINS is a
// comma-separated allowlist; when unset every origin is allowed (local dev).
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (allowedOrigins.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  // Answer preflight requests straight away.
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

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