import { Router } from "express";
import upload from "../middlewares/multer";
import allowOnlyLoggedInUser from "../middlewares/userAuth";
import * as userController from "../controllers/androidUserController";

const appUserRouter = Router();

appUserRouter
  .post("/register", userController.registerUser)
  .post("/login", userController.loginUser)
  .post("/sendMail", userController.sendMail)
  .post("/verifyOtp", userController.verifyOtp);

export default appUserRouter;
