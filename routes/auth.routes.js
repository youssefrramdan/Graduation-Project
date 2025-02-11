import express from "express";
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
 *     description: Create a new user account with validation for each field.
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
 *               name:
 *                 type: string
 *                 description: User's username
 *               ownerName:
 *                 type: string
 *                 description: Owner's full name
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               role:
 *                 type: string
 *                 enum: [pharmacy, inventory]
 *                 description: Role of the user
 *               city:
 *                 type: string
 *                 description: User's city
 *               location:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: Point
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     description: Coordinates [longitude, latitude]
 *               governorate:
 *                 type: string
 *                 description: Governorate of the user
 *               registrationNumber:
 *                 type: string
 *                 description: Registration number (unique)
 *               identificationNumber:
 *                 type: string
 *                 description: Identification number (unique)
 *               password:
 *                 type: string
 *                 description: User's password (min 8 characters)
 *               rePassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error, missing or invalid fields
 *       409:
 *         description: Conflict, email, registration number, or identification number already in use
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
 *       400:
 *         description: Missing or invalid fields
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Email not verified
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
 *         description: Invalid reset code or code has expired
 *       404:
 *         description: User not found
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
 *               email:
 *                 type: string
 *                 description: User's email address
 *               newPassword:
 *                 type: string
 *                 description: New password for the user (min 8 characters)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid reset code or request
 *       404:
 *         description: User not found
 */
authRouter.route("/resetPassword").put(resetPassword);

export default authRouter;
