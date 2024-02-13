import User from "./models/userModel";
import { Session } from "express-session";

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}

declare module "express-session" {
  interface SessionData {
    otp: string;
    email: string;
  }
}
