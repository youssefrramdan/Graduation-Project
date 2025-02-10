/* eslint-disable radix */
/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import UserModel from "../models/User.model.js";
import { sendEmail } from "../middlewares/sendEmail.js";

/**
 * @desc    Generate JWT Token
 */
const generateToken = (payload) =>
  jwt.sign({ userId: payload }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });

/**
 * @desc    User Signup - تسجيل المستخدم
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res, next) => {
  const coordinates = req.body.location.coordinates.map((coord) =>
    parseFloat(coord)
  );
  req.body.location = {
    type: "Point",
    coordinates: coordinates,
  };
  // if (!req.body.licenseDocument) {
  //  return next(new ApiError("licenseDocument is required ...." , 404))
  // }
  const user = await UserModel.create(req.body);

  sendEmail(user.email, "verification");

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
  });

  res.status(201).json({
    message: "success",
    user: {
      id : user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    token,
  });
});

/**
 * @desc    User Login
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 404));
  }

  if (!user.isVerified) {
    return next(
      new ApiError(
        "Your email is not verified. Please verify your email first.",
        401
      )
    );
  }

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
  });

  res.status(201).json({
    message: "success",
    user: {
      email: user.email,
      role: user.role,
      name: user.name,
    },
    token,
  });
});

/**
 * @desc    Confirm Email - تأكيد البريد الإلكتروني
 * @route   GET /api/v1/auth/verify/:token
 * @access  Public
 */
const confirmEmail = asyncHandler(async (req, res, next) => {
  jwt.verify(
    req.params.token,
    process.env.JWT_SECRET_KEY,
    async (err, decoded) => {
      if (err) return next(new ApiError("Email verification failed", 404));

      await UserModel.findOneAndUpdate(
        { email: decoded.email },
        { isVerified: true }
      );
      res.json({ message: "success" });
    }
  );
});

/**
 * @desc    Protect Routes - تأمين الوصول للراوتات
 * @route   Middleware
 * @access  Private
 */
const protectedRoutes = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new ApiError(
        "You are not logged in. Please log in to access this route",
        401
      )
    );
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const currentUser = await UserModel.findById(decoded.userId);

  if (!currentUser) {
    return next(
      new ApiError("The user belonging to this token no longer exists", 401)
    );
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000
    );
    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError("User recently changed password. Please login again.", 401)
      );
    }
  }

  req.user = currentUser;
  next();
});

/**
 * @desc    Allow Access to Specific Roles - تحديد الصلاحيات للمستخدمين
 */
const allowTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };

/**
 * @desc    Forgot Password - استعادة كلمة المرور
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgetPassword = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError("Email not found", 404));
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await bcrypt.hash(resetCode, 12);

  user.passwordResetCode = hashedCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;
  await user.save();

  sendEmail(user.email, "otp", resetCode);

  res.status(200).json({ message: "Reset code sent successfully" });
});

/**
 * @desc    Verify OTP Code - التحقق من كود OTP
 * @route   POST /api/v1/auth/verify-reset-code
 * @access  Public
 */
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

  res.status(200).json({ message: "success" });
});

/**
 * @desc    Reset Password - إعادة تعيين كلمة المرور
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user) {
    return next(new ApiError("Email not found", 404));
  }

  if (!user.passwordResetVerified) {
    return next(new ApiError("Reset code has not been verified", 400));
  }

  user.password = req.body.newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = false;
  await user.save();

  const token = generateToken(user._id);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
  });

  res.status(200).json({ message: "success", token });
});

export {
  signup,
  login,
  confirmEmail,
  protectedRoutes,
  allowTo,
  forgetPassword,
  verifyResetCode,
  resetPassword,
};
