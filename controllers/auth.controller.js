/* eslint-disable radix */
/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import UserModel from "../models/User.model.js";
import { sendEmail } from "../middlewares/sendEmail.js";
import { sendOtp } from "../middlewares/sendOtp.js";

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

  sendEmail(req.body.email);
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

const confirmEmail = asyncHandler(async (req, res, next) => {
  jwt.verify(
    req.params.token,
    process.env.JWT_SECRET_KEY,
    async (err, decoded) => {
      if (err) return next(new ApiError("not verified"), 404);

      await UserModel.findOneAndUpdate(
        { email: decoded.email },
        { isVerified: true }
      );
      res.json({ message: "success" });
    }
  );
});

const protectedRoutes = asyncHandler(async (req, res, next) => {
  // 1) Check if token exists, if exist get
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log(token);
  }
  if (!token) {
    return next(
      new ApiError("You are not login, Please login to get access this route"),
      401
    );
  }

  // 2) Verify token (no changes happens, expired tocken)
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  // 3) Check if user exists
  const currentUser = await UserModel.findById(decoded.userId);
  if (!currentUser) {
    return next(
      new ApiError("The user that belong to this token does no longer exist"),
      401
    );
  }

  // 4) Check if user change his password after token created
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000 );
    // Password changed after token created (Error)
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed his password. Please login again.."
        ),
        401
      );
    }
  }
  req.user = currentUser;
  next();
});

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
  await sendOtp(
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
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError("Reset code is invalid or has expired", 400));
  }

  const isCodeValid = await bcrypt.compare(
    req.body.resetCode,
    user.passwordResetCode
  );

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

  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save(); // ← تأكد من أنه يتم الحفظ بنجاح

  const token = genrateToken(user._id);
  res.status(200).json({ message: "Password reset successfully", token });
});

export {
  signup,
  login,
  confirmEmail,
  protectedRoutes,
  forgetPassword,
  verifyResetCode,
  resetPassword,
};
