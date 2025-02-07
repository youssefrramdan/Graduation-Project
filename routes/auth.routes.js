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

// Initialize file uploader for user license documents
const upload = createUploader("userslicenseDocuments", [
  "jpeg",
  "jpg",
  "png",
  "pdf",
]);

/**
 * @description  Register a new user
 * @route        POST /api/v1/auth/signup
 * @access       Public
 */
authRouter
  .route("/signup")
  .post(upload.single("licenseDocument"), signUpValidator, signup);

/**
 * @description  Verify email via token
 * @route        GET /api/v1/auth/verify/:token
 * @access       Public
 */
authRouter.route("/verify/:token").get(confirmEmail);

/**
 * @description  User login
 * @route        POST /api/v1/auth/login
 * @access       Public
 */
authRouter.route("/login").post(loginValidator, login);

/**
 * @description  Send a password reset request (Forget password)
 * @route        POST /api/v1/auth/forgetpassword
 * @access       Public
 */
authRouter.route("/forgetpassword").post(forgetPassword);

/**
 * @description  Verify reset code for password recovery
 * @route        POST /api/v1/auth/verifyResetCode
 * @access       Public
 */
authRouter.route("/verifyResetCode").post(verifyResetCode);

/**
 * @description  Reset password using a valid reset code
 * @route        PUT /api/v1/auth/resetPassword
 * @access       Public
 */
authRouter.route("/resetPassword").put(resetPassword);

export default authRouter;
