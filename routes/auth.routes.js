import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  loginValidator,
  signUpValidator,
} from "../utils/validators/authValidator.js";
import { forgetPassword, login, resetPassword, signup, verifyResetCode } from "../controllers/auth.controller.js";

const authRouter = express.Router();

const upload = createUploader("userslicenseDocuments", [
  "jpeg",
  "jpg",
  "png",
  "pdf",
]);

authRouter
  .route("/signup")
  .post(upload.single("licenseDocument"), signUpValidator, signup);

authRouter.route("/login").post(loginValidator, login);
authRouter.route("/forgetpassword").post(forgetPassword);
authRouter.route("/verifyResetCode").post(verifyResetCode);
authRouter.route("/resetPassword").put(resetPassword);

export default authRouter;
