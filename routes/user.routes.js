import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  activateSpecificUser,
  changeUserPassword,
  createUser,
  deleteUser,
  getAllUsers,
  getSpecificUser,
  updateUser,
} from "../controllers/User.controller.js";
import {
  activeValidator,
  createUserValidator,
  deleteUserValidator,
  getSpecificUserValidator,
  updateUserValidator,
} from "../utils/validators/userValidator.js";
import { protectedRoutes } from "../controllers/auth.controller.js";

const userRouter = express.Router();

const upload = createUploader("users", ["jpeg", "jpg", "png", "pdf"]);

userRouter
  .route("/")
  .get(getAllUsers)
  .post(
    upload.single("licenseDocument"),
    createUserValidator,
    createUser
  );

userRouter
  .route("/:id")
  .get(getSpecificUserValidator, getSpecificUser)
  .put(protectedRoutes,updateUserValidator, updateUser)
  .delete(deleteUserValidator, deleteUser);
userRouter.route("/changePassword/:id").patch(changeUserPassword);
userRouter.route("/activate/:id").patch(activeValidator,activateSpecificUser);
export default userRouter;
