// Basic Imports
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Express } from "express";
import mongoose from "mongoose";
import cron from "node-cron";
import path from "path";
// File Imports
import webUserRouter from "./routes/webUserRouter";
import { clearExpiredOTPs } from "./utils/otpUtils";

// Creating Backend Application
const app: Express = express();

// Middlewares
app.use(
  cors({
    origin: "https://expenshare.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view-engine", "ejs");
app.set("views", path.resolve("./views"));

// Routes
app.use("/user/v1", webUserRouter);
// app.use("/user/v2", appUserRouter);

// OTP Cleanup
cron.schedule(
  "0 * * * *",
  async () => {
    console.log("Running otp cleanup job...");
    try {
      await clearExpiredOTPs();
      console.log("Session cleanup completed.");
    } catch (error) {
      console.error("Error during session cleanup:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Kolkata",
  }
);

// DB Connection
const PORT: number = 8080 | Number(process.env.PORT);
const DB_URL: string = String(process.env.DB_URL);

mongoose
  .connect(DB_URL)
  .then(() => {
    console.log("Database Connected");
    app.listen(PORT, () => {
      console.log("Server Started");
    });
  })
  .catch((err) => {
    console.log(err);
  });
