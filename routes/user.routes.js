import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getSpecificUser,
  updateUser,
} from "../controllers/User.controller.js";
import {
  createUserValidator,
  deleteUserValidator,
  getSpecificUserValidator,
  updateUserValidator,
} from "../utils/validators/userValidator.js";

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
  .put(updateUserValidator, updateUser)
  .delete(deleteUserValidator, deleteUser);

export default userRouter;
