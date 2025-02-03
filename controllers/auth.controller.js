/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import ApiError from "../utils/apiError.js";
import UserModel from "../models/User.model.js";
import { sendEmail } from "./Email/sendEmail.js";


const genrateToken = (payload) =>
  jwt.sign({ userId: payload }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });

const signup = asyncHandler(async (req, res, next) => {
  if (!req.file.path) {
    return next(new ApiError("Please Send licenseDocument ..."));
  }
  req.body.licenseDocument = req.file.path;
  const coordinates = req.body.location.coordinates.map((coord) =>
    parseFloat(coord)
  );
  req.body.location = {
    type: "Point",
    coordinates: coordinates,
  };
  if (!req.body.role && !["pharmacy", "inventory"].includes(req.body.role)) {
    next(
      new ApiError("please enter your role from this ['pharmacy', 'inventory']")
    );
  }

  const user = await UserModel.create(req.body);
  // 2 - generate Token
  const token = genrateToken(user._id);
  res
    .status(201)
    .json({ message: "user created successfully", data: user, token });
});

const login = asyncHandler(async (req, res, next) => {
  // 1) check if password and email in the body (validator)
  const user = await UserModel.findOne({
    email: req.body.email,
  });
  // 2) check if user exist & check if password  is correct

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("incorrect email or password"), 404);
}

  // 3)  generate token
  const token = genrateToken(user._id);
  // 4) send response to client side
  res.status(200).json({ message: "success", data: user, token });
});




//  forgetPassword
const forgetPassword = asyncHandler(async (req, res, next) => {

  const user = await UserModel.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError("Email not found", 404));
  }


  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(resetCode);
  const hashedCode = await bcrypt.hash(resetCode, 12);
  console.log(hashedCode);
   
  user.passwordResetCode = hashedCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;
   await user.save();
   await sendEmail(
    user.email,
    "Password Reset Code",
    `Your password reset code is: ${resetCode}\nThis code will expire in 10 minutes.`
);

   res.status(200).json({
     message: "Reset code sent successfully",
   });
  });


  const verifyResetCode = asyncHandler(async (req, res, next) => {
    const user = await UserModel.findOne({
        passwordResetExpires: { $gt: Date.now() } 
    });

    if (!user) {
        return next(new ApiError("Reset code is invalid or has expired", 400));
    }

    const isCodeValid = await bcrypt.compare(req.body.resetCode, user.passwordResetCode);

    if (!isCodeValid) {
        return next(new ApiError("Invalid reset code", 400));
    }

    user.passwordResetVerified = true;
    await user.save();

    res.status(200).json({ message: "Reset code verified successfully" });
});

const resetPassword = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user) {
      return next(new ApiError("Email not found", 404));
  }

  if (!user.passwordResetVerified) {
      return next(new ApiError("Reset code has not been verified", 400));
  }

  // تحديث كلمة المرور الجديدة
  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save(); // ← تأكد من أنه يتم الحفظ بنجاح

  const token = genrateToken(user._id);
  res.status(200).json({ message: "Password reset successfully", token });
});







export { signup, login ,forgetPassword, verifyResetCode, resetPassword};
