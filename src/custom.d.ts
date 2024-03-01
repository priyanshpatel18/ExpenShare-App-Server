import User from "./models/User";
import { Session } from "express-session";

declare module "express-serve-static-core" {
  interface Request {
    user: User;
  }
}