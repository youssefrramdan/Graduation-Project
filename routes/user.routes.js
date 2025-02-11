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
  getSpecificUser,
  getUserFiles,
  updateMe,
  updateMyPassword,
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

// Initialize file uploader for user-related uploads
const upload = createUploader("users", ["jpeg", "jpg", "png", "pdf"]);

/**
 * @description  Get all users / Create a new user
 * @route        GET, POST /api/v1/users
 * @access       Private (Admin only for POST)
 */
userRouter
  .route("/")
  .get(getAllUsers) // Retrieve all users
  .post(
    protectedRoutes, // Protect route (Admin only)
    upload.single("licenseDocument"), // Handle file upload for licenseDocument
    createUserValidator, // Validate request body
    createUser // Create new user
  );
  
userRouter.route("/files").get(protectedRoutes, getUserFiles); // Get user's files




userRouter.route("/getMe").get(protectedRoutes, getMe, getSpecificUser);
userRouter.route("/updateMyPassword").patch(protectedRoutes, updateMyPassword);
userRouter.route("/updateMe").patch(protectedRoutes, updateMe);
userRouter.route("/deactivateMe").patch(protectedRoutes, deactivateMe);
userRouter.route("/activateMe").patch(protectedRoutes, activateMe);





/**
 * @description  Get, update, or delete a specific user by ID
 * @route        GET, PUT, DELETE /api/v1/users/:id
 * @access       Private (Admin only)
 */
userRouter
  .route("/:id")
  .get(getSpecificUserValidator, getSpecificUser) // Get user by ID
  .put(protectedRoutes, updateUserValidator, updateUser) // Update user details
  .delete(protectedRoutes, deleteUserValidator, deleteUser); // Delete user

/**
 * @description  Change a user's password
 * @route        PATCH /api/v1/users/changePassword/:id
 * @access       Private (User only)
 */
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword); // Change user password

/**
 * @description  Activate or deactivate a user account
 * @route        PATCH /api/v1/users/activate/:id
 * @access       Private (Admin only)
 */
userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser); // Activate/Deactivate user


  
export default userRouter;
