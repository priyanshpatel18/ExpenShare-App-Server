import { Router } from "express";
import multer from "multer";
import * as controller from "../controllers/Group";

// Configure Storage
const storage: multer.StorageEngine = multer.diskStorage({
  filename: function (req: Express.Request, file: Express.Multer.File, cb) {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// Create Middleware with the storage
const upload: multer.Multer = multer({ storage: storage });

const groupRouter: Router = Router();

groupRouter
  .post("/create", upload.single("groupProfile"), controller.createGroup)
  .post("/getAll", controller.getAllGroups)
  .post("/removeMember", controller.removeMember)
  .post("/addTransaction", controller.addGroupTransaction);

export default groupRouter;
