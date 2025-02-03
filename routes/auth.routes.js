import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  loginValidator,
  signUpValidator,
} from "../utils/validators/authValidator.js";
import { login, signup, verify } from "../controllers/auth.controller.js";

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


authRouter.route("/verify/:token")
  .get(verify);
authRouter.route("/login").post(loginValidator, login);

export default authRouter;
