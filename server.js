const express = require("express");
require("dotenv").config();

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
// app.use(cors({origin:["*"],
//     credentials:true
// })  

// Student Routes
app.use("/api/students", studentRoutes);

// Faculty Routes
app.use("/api/faculty", facultyRoutes);

// Public Test Route
app.get("/", (req, res) => {
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
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error Middleware (must be last)
app.use(errorMiddleware);

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();