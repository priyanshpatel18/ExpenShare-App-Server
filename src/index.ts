// Basic Imports
import cors from "cors";
import "dotenv/config";
import express, { Express } from "express";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import cron from "node-cron";
import path from "path";
// File Imports
import { transactionRouter, userRouter } from "./routes/router";

// Creating Backend Application
const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view-engine", "ejs");
app.set("views", path.resolve("./views"));

// Routes
app.use("/user", userRouter);
app.use("/transaction", transactionRouter);

// OTP Cleanup
cron.schedule(
  "0 * * * *",
  async () => {
    try {
      const client = await MongoClient.connect(process.env.DB_URL!);
      const db = client.db();
      const otpCollection = db.collection("otps");
      const userDataCollection = db.collection("userdatas");
      const now = new Date();

      await otpCollection.deleteMany({ expires: { $lt: now } });
      await userDataCollection.deleteMany({ expires: { $lt: now } });
      console.log("Expired Colections cleared successfully.");
      client.close();
    } catch (error) {
      console.error("Error clearing Expired Collection:", error);
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
