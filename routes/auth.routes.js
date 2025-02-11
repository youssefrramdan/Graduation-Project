import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  loginValidator,
  signUpValidator,
} from "../utils/validators/authValidator.js";

import {
  confirmEmail,
  forgetPassword,
  login,
  resetPassword,
  signup,
  verifyResetCode,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
authRouter.route("/signup").post(signUpValidator, signup);

/**
 * @swagger
 * /api/v1/auth/verify/{token}:
 *   get:
 *     summary: Verify email via token
 *     description: Verify the user's email address using a unique token.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
authRouter.route("/verify/:token").get(confirmEmail);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid email or password
 */
authRouter.route("/login").post(loginValidator, login);

/**
 * @swagger
 * /api/v1/auth/forgetpassword:
 *   post:
 *     summary: Send password reset request
 *     description: Send a reset request to the user's email for password recovery.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset request sent
 *       404:
 *         description: User not found
 */
authRouter.route("/forgetpassword").post(forgetPassword);

/**
 * @swagger
 * /api/v1/auth/verifyResetCode:
 *   post:
 *     summary: Verify reset code for password recovery
 *     description: Verify the reset code sent to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetCode:
 *                 type: string
 *                 description: The reset code sent to the user's email
 *     responses:
 *       200:
 *         description: Reset code verified successfully
 *       400:
 *         description: Invalid reset code
 */
authRouter.route("/verifyResetCode").post(verifyResetCode);

/**
 * @swagger
 * /api/v1/auth/resetPassword:
 *   put:
 *     summary: Reset password using a valid reset code
 *     description: Reset the user's password using a verified reset code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetCode:
 *                 type: string
 *                 description: Verified reset code
 *               newPassword:
 *                 type: string
 *                 description: New password for the user
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid reset code or request
 */
authRouter.route("/resetPassword").put(resetPassword);

export default authRouter;
