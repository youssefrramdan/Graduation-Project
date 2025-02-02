/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import UserModel from "../models/User.model.js";

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

export { signup, login };
