import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/User";

// Configure Storage
const storage: multer.StorageEngine = multer.diskStorage({
  filename: function (req: Express.Request, file: Express.Multer.File, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// Create Middleware with the storage
const upload: multer.Multer = multer({ storage: storage });

const userRouter: Router = Router();

userRouter
  .post("/resetPassword", controller.resetPassword)
  .post("/register", upload.single("profilePicture"), controller.registerUser)
  .post("/login", controller.loginUser)
  .post("/sendMail", controller.sendMail)
  .post("/sendVerifyEmail", controller.sendVerifyEmail)
  .post("/verifyOtp", controller.verifyOtp)
  .post("/getUser", controller.getUser)
  .post("/delete", controller.deleteUser)
  .post("/update", upload.single("profilePicture"), controller.updateUser)
  .post("/getRequests", controller.getAllNotifications)
  .post("/handleRequest", controller.handleRequest);

export default userRouter;
