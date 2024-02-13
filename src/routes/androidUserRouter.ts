import { Router } from "express";
import upload from "../middlewares/multer";
import allowOnlyLoggedInUser from "../middlewares/userAuth";
import * as userController from "../controllers/androidUserController";

const appUserRouter = Router();

appUserRouter
  .post(
    "/register",
    upload.single("profilePicture"),
    userController.registerUser
  )
  .post("/login", userController.loginUser)
  .post("/sendMail", userController.sendMail)
  .post("/sendVerifyEmail", userController.sendVerifyEmail)
  .post("/verifyMail", userController.verifyOtp)
  .post("/verifyEmail", userController.verifyEmail);

export default appUserRouter;
