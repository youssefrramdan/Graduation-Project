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

authRouter.route("/signup").post(signUpValidator, signup);

authRouter.route("/verify/:token").get(confirmEmail);

authRouter.route("/login").post(loginValidator, login);

authRouter.route("/forgetpassword").post(forgetPassword);

authRouter.route("/verifyResetCode").post(verifyResetCode);

authRouter.route("/resetPassword").put(resetPassword);

export default authRouter;
