import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/Transaction";

// Configure Storage
const storage: multer.StorageEngine = multer.diskStorage({
  filename: function (req: Express.Request, file: Express.Multer.File, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// Create Middleware with the storage
const upload: multer.Multer = multer({ storage: storage });

const transactionRouter: Router = Router();

transactionRouter
  .post("/add", upload.single("invoice"), controller.addTransaction)
  .post("/getAll", controller.getAllTransactions)
  .post("/delete", controller.deleteTransaction);

export default transactionRouter;
