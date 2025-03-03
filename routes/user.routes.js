import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  activateMe,
  activateSpecificUser,
  changeUserPassword,
  createUser,
  deactivateMe,
  deleteUser,
  getAllUsers,
  getMe,
  getNearestInventories,
  getSpecificUser,
  getUserFiles,
  updateMe,
  updateMyPassword,
  updateUser,
  updateUserImage,
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
// admin routes
userRouter.route("/").get(getAllUsers);
userRouter.route("/").post(protectedRoutes, createUserValidator, createUser);
userRouter.route("/inventories").get(protectedRoutes, getNearestInventories);

userRouter.route("/:id").get(getSpecificUserValidator, getSpecificUser);
userRouter.route("/:id").put(protectedRoutes, updateUserValidator, updateUser);
userRouter
  .route("/:id")
  .delete(protectedRoutes, deleteUserValidator, deleteUser);
userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser);
// user routes
userRouter.route("/getMe").get(protectedRoutes, getMe);
userRouter.route("/files").get(protectedRoutes, getUserFiles);
userRouter.route("/updateMe").patch(protectedRoutes, updateMe);
userRouter.route("/updateMyPassword").patch(protectedRoutes, updateMyPassword);
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword);

userRouter
  .route("/profileimage")
  .patch(protectedRoutes, upload.single("profileImage"), updateUserImage);
userRouter.route("/deactivate").patch(protectedRoutes, deactivateMe);
userRouter.route("/activate").patch(protectedRoutes, activateMe);

export default userRouter;
