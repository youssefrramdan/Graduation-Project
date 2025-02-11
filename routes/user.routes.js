import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  activateSpecificUser,
  changeUserPassword,
  createUser,
  deleteUser,
  getAllUsers,
  getSpecificUser,
  getUserFiles,
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

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Retrieve all users
 *     description: Get a list of all registered users.
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with license document upload.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               licenseDocument:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 */
userRouter
  .route("/")
  .get(getAllUsers)
  .post(
    protectedRoutes,
    upload.single("licenseDocument"),
    createUserValidator,
    createUser
  );

/**
 * @swagger
 * /api/v1/users/files:
 *   get:
 *     summary: Get user's files
 *     description: Retrieve files related to users.
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
userRouter.route("/files").get(protectedRoutes, getUserFiles);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Retrieve a specific user's details by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *   put:
 *     summary: Update user details
 *     description: Update a specific user's details by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user
 *     description: Remove a specific user by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
userRouter
  .route("/:id")
  .get(getSpecificUserValidator, getSpecificUser)
  .put(protectedRoutes, updateUserValidator, updateUser)
  .delete(protectedRoutes, deleteUserValidator, deleteUser);

/**
 * @swagger
 * /api/v1/users/changePassword/{id}:
 *   patch:
 *     summary: Change a user's password
 *     description: Change the password for a specific user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
userRouter
  .route("/changePassword/:id")
  .patch(protectedRoutes, changeUserPassword);

/**
 * @swagger
 * /api/v1/users/activate/{id}:
 *   patch:
 *     summary: Activate or deactivate a user account
 *     description: Toggle the active status of a user account.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User activated or deactivated successfully
 */
userRouter
  .route("/activate/:id")
  .patch(protectedRoutes, activeValidator, activateSpecificUser);

export default userRouter;
