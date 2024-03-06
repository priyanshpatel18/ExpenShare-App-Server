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
import * as socketController from "./controllers/Socket";
import userRouter from "./routes/User";
import groupRouter from "./routes/Group";
import transactionRouter from "./routes/Transaction";

// Creating Backend Application
const app: Express = express();
// Create a HTTP Server
const server = createServer(app);
// Create an IO Server
export const io = new Server(server);
// Socket Connection

// Create an interface to define the email-to-socket mapping
interface EmailToSocketMap {
  [email: string]: string;
}

// Create an empty object to store the mapping between email and socket ID
export const emailToSocketMap: EmailToSocketMap = {};

io.on("connection", (socket) => {
  console.log("User", socket.id);

  // Bind email to the socketId
  socket.on("login", (email) => {
    if (email) {
      emailToSocketMap[email] = socket.id;
      console.log(emailToSocketMap);
    } else {
      console.log("Invalid email:", email);
    }
  });

  // Filter Users
  socket.on("getUsers", (filter: string) => {
    socketController.handleGetUsers(socket, filter);
  });
  // Sends Request
  socket.on("sendRequest", (data) => {
    socketController.handleSendRequest(socket, data);
  });

  socket.on("acceptRequest", (data) => {
    socketController.updateGroup(socket, data);
  });

  socket.on("addTransaction", (data) => {
    socketController.updateGroup(socket, data);
  });

  socket.on("removeMember", (data) => {
    socketController.updateGroup(socket, data);
  });

  socket.on("deleteBalance", (data) => {
    socketController.updateGroup(socket, data);
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

export default app;
