import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

import { sendEmail } from "../middlewares/sendEmail.js";

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(UserModel.find(), req.query)
    .filter()
    .search(["name", "ownerName", "city", "governorate"])
    .sort()
    .limitFields();

  await features.paginate();

  const users = await features.mongooseQuery;
  const paginationResult = features.getPaginationResult();

  res.status(200).json({
    status: "success",
    pagination: paginationResult,
    results: users.length,
    data: users,
  });
});

/**
 * @desc    Get specific user by ID
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
const getSpecificUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findById(id);

  if (!user) {
    return next(new ApiError(`There isn't a user for this ${id}`, 404));
  }

  res.status(200).json({ message: "success", user: user });
});

/**
 * @desc    Update user's active status
 * @route   PATCH /api/v1/users/activate/:id
 * @access  Private
 */
const activateSpecificUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findByIdAndUpdate(id, { active: true });

  if (!user) {
    return next(new ApiError(`There isn't a user for this ID: ${id}`, 404));
  }

  res.status(200).json({ message: "success" });
});

/**
 * @desc    Create a new user
 * @route   POST /api/v1/users
 * @access  Private
 */
const createUser = asyncHandler(async (req, res, next) => {
  if (req.body.location && req.body.location.coordinates) {
    // Convert each coordinate to a float
    const coordinates = req.body.location.coordinates.map((coord) =>
      parseFloat(coord)
    );
    // Check if every coordinate is a valid number
    if (!coordinates.some(Number.isNaN)) {
      // If valid, assign the location as a GeoJSON Point object
      req.body.location = {
        type: "Point",
        coordinates: coordinates,
      };
    }
  }

  const user = await UserModel.create(req.body);
  sendEmail(user.email, "verification");

  res.status(201).json({ message: "success", user: user });
});

/**
 * @desc    Update an existing user
 * @route   PUT /api/v1/users/:id
 * @access  Private
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select(
    "-password -identificationNumber -registrationNumber -role -location"
  );
  if (!user) {
    return next(new ApiError(`There is no user with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success", user: user });
});

/**
 * @desc    Delete an existing user
 * @route   DELETE /api/v1/users/:id
 * @access  Private
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Find user first to check if exists
  const user = await UserModel.findById(id);
  if (!user) {
    return next(new ApiError(`There isn't a user for this ${id}`, 404));
  }

  await user.remove();

  res.status(200).json({
    status: "success",
    message: "User and all associated data deleted successfully",
  });
});

/**
 * @desc    Change user password
 * @route   PATCH /api/v1/users/changePassword/:id
 * @access  Private
 */
const changeUserPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const hashedPassword = await bcrypt.hash(req.body.password, 12);
  const user = await UserModel.findByIdAndUpdate(
    id,
    {
      password: hashedPassword,
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!user) {
    return next(new ApiError(`There is no user with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success", user: user });
});

const getUserFiles = asyncHandler(async (req, res) => {
  console.log("Params:", req.params);
  console.log("Body:", req.body);

  const user = await UserModel.findById(req.user._id).select("files");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  res.status(200).json({
    status: "success",
    files: user.files,
  });
});

/**
 * @desc    Get Logged-in User Data
 * @route   GET /api/v1/users/getMe
 * @access  Private (User)
 */
const getMe = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user._id) {
    return next(
      new ApiError("User authentication failed. Please log in...", 401)
    );
  }
  const user = await UserModel.findById(req.user._id);
  res.status(200).json({
    status: "success",
    user,
  });
});

/**
 * @desc    Update Logged-in User Password
 * @route   PATCH /api/v1/users/updateMyPassword
 * @access  Private (User)
 */
const updateMyPassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return next(new ApiError("enter both old and new passwords", 400));
  }

  const user = await UserModel.findById(req.user._id).select("+password");

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    return next(new ApiError("Incorrect old password", 400));
  }

  user.password = await newPassword;
  user.passwordChangedAt = Date.now();

  await user.save();

  res.status(200).json({ message: "success" });
});

/**
 * @desc    Update Logged-in User Data
 * @route   PATCH /api/v1/users/updateMe
 * @access  Private (User only)
 */
const updateMe = asyncHandler(async (req, res, next) => {
  if (req.body.password || req.body.oldPassword) {
    return next(new ApiError("This route is not for password updates", 400));
  }

  if (req.body.email) {
    const existingUser = await UserModel.findOne({ email: req.body.email });
    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      return next(
        new ApiError("Email already exists. Please use a different one.", 400)
      );
    }
  }
  const user = await UserModel.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password -__v");

  res.status(200).json({
    message: "success",
    user,
  });
});

const updateUserImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError("please upload imageCover", 404));
  }
  req.body.profileImage = req.file.path;
  const user = await UserModel.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    message: "success",
    user,
  });
});

const deactivateMe = asyncHandler(async (req, res, next) => {
  await UserModel.findByIdAndUpdate(req.user._id, { active: false }).select(
    "-password -__v"
  );

  res.status(200).json({
    message: "success",
  });
});
const activateMe = asyncHandler(async (req, res, next) => {
  await UserModel.findByIdAndUpdate(req.user._id, { active: true }).select(
    "-password -__v"
  );

  res.status(200).json({
    message: "success",
  });
});

const getNearestInventories = asyncHandler(async (req, res, next) => {
  const userCoordinates = req.user.location.coordinates;
  const inventories = await UserModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: userCoordinates },
        spherical: true,
        query: { role: "inventory" },
        distanceField: "calcDistance",
      },
    },
    {
      $project: {
        name: 1,
        location: 1,
        role: 1,
        DistanceInKm: { $divide: ["$calcDistance", 1000] }, // تحويل المسافة إلى كم
      },
    },
  ]);
  res.status(200).json({ message: "success", inventories });
});

export {
  getAllUsers,
  getSpecificUser,
  activateSpecificUser,
  createUser,
  updateUser,
  deleteUser,
  getUserFiles,
  changeUserPassword,
  getMe,
  updateMyPassword,
  updateMe,
  updateUserImage,
  deactivateMe,
  activateMe,
  getNearestInventories,
};
