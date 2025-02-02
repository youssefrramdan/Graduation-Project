import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  changeUserPassword,
  createUser,
  deleteUser,
  getAllUsers,
  getSpecificUser,
  updateUser,
} from "../controllers/User.controller.js";
import {
  changePasswordValidator,
  createUserValidator,
  deleteUserValidator,
  getSpecificUserValidator,
  updateUserValidator,
} from "../utils/validators/userValidator.js";

const userRouter = express.Router();

const upload = createUploader("userslicenseDocuments", [
  "jpeg",
  "jpg",
  "png",
  "pdf",
]);

userRouter
  .route("/")
  .get(getAllUsers)
  .post(upload.single("licenseDocument"), createUserValidator, createUser);
const uploadProfileImage = createUploader("usersImages", [
  "jpeg",
  "jpg",
  "png",
  "pdf",
]);
userRouter.route("/changePassword/:id").put(changePasswordValidator,changeUserPassword)
userRouter
  .route("/:id")
  .get(getSpecificUserValidator, getSpecificUser)
  .put(
    uploadProfileImage.single("profileImage"), 
    updateUserValidator,
    updateUser
  )
  .delete(deleteUserValidator, deleteUser);

export default userRouter;
