import User from "./models/userModel";
import { Session } from "express-session";

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}