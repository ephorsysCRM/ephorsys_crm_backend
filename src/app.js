import express from "express";
import morgan from "morgan";
import router from "./routes/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";

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

export default app;

// app is export Here and Import in Server.js
