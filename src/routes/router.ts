import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/controllers";

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
  .post("/getAllUsers", controller.getAllUsers)
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

const transactionRouter: Router = Router();

transactionRouter
  .post("/add", upload.single("invoice"), controller.addTransaction)
  .post("/getAll", controller.getAllTransactions)
  .post("/delete", controller.deleteTransaction);

const groupRouter: Router = Router();

groupRouter
  .post("/create", upload.single("groupProfile"), controller.createGroup)
  .post("/getAll", controller.getAllGroups);

export { transactionRouter, userRouter, groupRouter };
