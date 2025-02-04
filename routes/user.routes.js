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
    protectedRoutes,
    upload.single("licenseDocument"),
    createUserValidator,
    createUser
  );

userRouter
  .route("/:id")
  .get(getSpecificUserValidator, getSpecificUser)
  .put(protectedRoutes, updateUserValidator,upload.single('profileImage'), updateUser)
  .delete(protectedRoutes, deleteUserValidator, deleteUser);
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword);
userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser);
export default userRouter;
