import { Router } from "express";
import upload from "../middlewares/multer";
import * as userController from "../controllers/androidUserController";

const appUserRouter = Router();

appUserRouter
  .post("/resetPassword", userController.resetPassword)
  .post(
    "/register",
    upload.single("profilePicture"),
    userController.registerUser
  )
  .post("/login", userController.loginUser)
  .post("/sendMail", userController.sendMail)
  .post("/sendVerifyEmail", userController.sendVerifyEmail)
  .post("/verifyOtp", userController.verifyOtp)
  .post("/getUser", userController.getUser);

export default appUserRouter;
