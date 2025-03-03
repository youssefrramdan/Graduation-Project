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
import { updateDrugImage } from "../controllers/drug.controller.js";

const userRouter = express.Router();
const upload = createUploader("users", ["jpeg", "jpg", "png", "pdf"]);

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Endpoints for managing users
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Retrieve a list of all users with optional filters, sorting, and pagination.
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Keyword to search users by name, owner name, city, or governorate.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of users.
 *       400:
 *         description: Invalid query parameters.
 */
userRouter.route("/").get(getAllUsers);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Add a new user to the system with all necessary validation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address (must be unique)
 *               password:
 *                 type: string
 *                 description: User's password (min 8 characters)
 *               rePassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *               role:
 *                 type: string
 *                 description: User's role
 *               identificationNumber:
 *                 type: string
 *                 description: Unique identification number
 *               registrationNumber:
 *                 type: string
 *                 description: Unique registration number
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Validation error or missing fields.
 *       409:
 *         description: Conflict, email or identification number already in use.
 */
userRouter
  .route("/")
  .post(
    protectedRoutes,
    upload.single("licenseDocument"),
    createUserValidator,
    createUser
  );

userRouter.route("/getMe").get(protectedRoutes, getMe, getSpecificUser);
userRouter.route("/updateMyPassword").patch(protectedRoutes, updateMyPassword);
userRouter.route("/updateMe").patch(protectedRoutes, updateMe);
userRouter.route("/deactivateMe").patch(protectedRoutes, deactivateMe);
userRouter.route("/activateMe").patch(protectedRoutes, activateMe);
userRouter.route("/inventories").get(protectedRoutes, getNearestInventories);

/**
 * @swagger
 * /api/v1/users/files:
 *   get:
 *     tags: [Users]
 *     summary: Get user files
 *     description: Retrieve the files associated with the logged-in user.
 *     responses:
 *       200:
 *         description: Successfully retrieved user files.
 *       404:
 *         description: User not found.
 */
userRouter.route("/files").get(protectedRoutes, getUserFiles);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get specific user by ID
 *     description: Retrieve details of a specific user by their ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID.
 *     responses:
 *       200:
 *         description: Successfully retrieved user details.
 *       404:
 *         description: User not found.
 */
userRouter.route("/:id").get(getSpecificUserValidator, getSpecificUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user by ID
 *     description: Update details of a specific user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Updated email address.
 *               role:
 *                 type: string
 *                 description: Updated role.
 *     responses:
 *       200:
 *         description: User updated successfully.
 *       400:
 *         description: Validation error.
 *       404:
 *         description: User not found.
 */
userRouter.route("/:id").put(protectedRoutes, updateUserValidator, updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete user by ID
 *     description: Remove a specific user from the system.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       404:
 *         description: User not found.
 */
userRouter
  .route("/:id")
  .delete(protectedRoutes, deleteUserValidator, deleteUser);

/**
 * @swagger
 * /api/v1/users/changePassword/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Change user password
 *     description: Update the password for a specific user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: User's current password.
 *               password:
 *                 type: string
 *                 description: New password (min 8 characters).
 *               rePassword:
 *                 type: string
 *                 description: Password confirmation (must match new password).
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Validation error or incorrect current password.
 *       404:
 *         description: User not found.
 */
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword);

userRouter
  .route("/image/:id")
  .patch(protectedRoutes, upload.single("profileImage"), updateUserImage);
/**
 * @swagger
 * /api/v1/users/activate/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Activate specific user
 *     description: Activate the account of a specific user by their ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID.
 *     responses:
 *       200:
 *         description: User activated successfully.
 *       404:
 *         description: User not found.
 */
userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser);

export default userRouter;
