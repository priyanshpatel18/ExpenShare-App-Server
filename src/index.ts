// Basic Imports
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Express } from "express";
import { createServer } from "http";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import cron from "node-cron";
import path from "path";
import { Server } from "socket.io";
// File Imports
import { groupRouter, transactionRouter, userRouter } from "./routes/router";
import { User, UserDocument } from "./models/models";

// Creating Backend Application
const app: Express = express();
// Create a HTTP Server
const server = createServer(app);
// Create an IO Server
const io = new Server(server);
// Socket Connection
io.on("connection", (socket) => {
  console.log("User", socket.id);

  socket.on("getUsers", async (filter) => {
    try {
      // Filter users based on userName or email
      const users: UserDocument[] | null = await User.find({
        $or: [
          { userName: { $regex: filter, $options: "i" } },
          { email: { $regex: filter, $options: "i" } },
        ],
      });

      // Emit the filtered users
      socket.emit("filteredUsers", users);
    } catch (error) {
      console.error("Error filtering users:", error);
    }
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("Socket disconnected", socket.id);
  });
});

// Middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view-engine", "ejs");
app.set("views", path.resolve("./views"));

// Routes
app.use("/user", userRouter);
app.use("/transaction", transactionRouter);
app.use("/group", groupRouter);

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
    server.listen(PORT, () => {
      console.log("Server Started");
    });
  })
  .catch((err) => {
    console.log(err);
  });
