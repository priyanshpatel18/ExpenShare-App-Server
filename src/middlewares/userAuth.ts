import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import User, { UserDocument } from "../models/userModel";
import { getToken } from "../service/auth";

export default async function allowOnlyLoggedInUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { token } = req.cookies;

  // Verify Token or Check if Token Exist
  if (!getToken(token) || !token) {
    return res.status(501).send("You need to Login First");
  }

  // Decode the Token
  const decodedToken: string | JwtPayload | null = getToken(token);

  if (!decodedToken || typeof decodedToken === "string") {
    return res.status(401).send("Invalid token");
  }

  // Find User from the decoded Token using _id
  const userId: string = decodedToken._id;
  const user: UserDocument | null = await User.findById(userId);
  if (!user) {
    return res.status(401).send("You need to Login First");
  }

  // Set User in the request for the next API Call
  req.user = user;
  next();
}
