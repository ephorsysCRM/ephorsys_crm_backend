import express from "express";
import morgan from "morgan";
import router from "./routes/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import AppError from "./utils/AppError.js";

const app = express();

// ---------------------------------------------
// CORS Configuration
// ---------------------------------------------
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// ---------------------------------------------
// Middleware
// ---------------------------------------------
app.use(express.json());
app.use(cookieParser());

// ---------------------------------------------
// Morgan Logger
// ---------------------------------------------
app.use(morgan("dev"));


// ---------------------------------------------
// API Prefix
// ---------------------------------------------

app.use("/api/v1", router);

// ---------------------------------------------
// Global Error Handler
// ---------------------------------------------
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  if (statusCode === 500) {
    console.error("Global Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;

// app is export Here and Import in Server.js
