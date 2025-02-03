/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";
import bcrypt from "bcryptjs";

/**
 * @desc    Get all users
 * @route   GET /api/v1/users
 * @access  Private
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.keyword) {
    filter.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { ownerName: { $regex: req.query.keyword, $options: "i" } },
      { city: { $regex: req.query.keyword, $options: "i" } },
      { governorate: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const countDocuments = await UserModel.countDocuments(filter);

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const pagination = {
    currentPage: page,
    resultsPerPage: limit,
    totalPages: Math.ceil(countDocuments / limit),
  };

  if (page * limit < countDocuments) pagination.nextPage = page + 1;
  if (page > 1) pagination.previousPage = page - 1;

  let mongooseQuery = UserModel.find(filter).skip(skip).limit(limit).lean();

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    mongooseQuery = mongooseQuery.select(fields);
  }

  const users = await mongooseQuery;

  res.status(200).json({
    message: "success",
    pagination,
    result: users.length,
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
  const user = await UserModel.findById(id).select("-password -__v");

  if (!user) {
    return next(new ApiError(` there isnt user for this ${id}`, 404));
  }

  res.status(200).json({ message: "success", data: user });
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

  res.status(200).json({ message: "User activated successfully", data: user });
});


/**
 * @desc    Create a new user
 * @route   POST /api/v1/users
 * @access  Private
 */
const createUser = asyncHandler(async (req, res, next) => {
  if (!req.file.path) {
    return next(new ApiError("Please Send licenseDocument ..."));
  }
  req.body.licenseDocument = req.file.path;
  
  const coordinates = req.body.location.coordinates.map((coord) =>
    parseFloat(coord)
  );
  if (coordinates.some(isNaN)) {
    return next(
      new ApiError(
        "Invalid coordinates. Please provide valid longitude and latitude.",
        400
      )
    );
  }

  req.body.location = {
    type: "Point",
    coordinates: coordinates,
  };

  const user = await UserModel.create(req.body);

  res.status(201).json({ message: "success", data: user });
});

/**
 * @desc    Update an existing user
 * @route   PUT /api/v1/users/:id
 * @access  Private
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (req.file && req.file.path) {
    req.body.profileImage = req.file.path;
  }

  const user = await UserModel.findByIdAndUpdate(
    id,
    {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      profileImage: req.body.profileImage,
      role: req.body.role,
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -__v");
  if (!user) {
    return next(new ApiError(`There is no user with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success", data: user });
});

/**
 * @desc    Delete an existing user
 * @route   DELETE /api/v1/users/:id
 * @access  Private
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    return next(new ApiError(`There isnt user for this ${id}`, 404));
  }

  res.status(200).json({ message: "success", data: user });
});
const changeUserPassword = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const hashedPassword = await bcrypt.hash(req.body.password , 12)
  const user = await UserModel.findByIdAndUpdate(
    id,
    {password : hashedPassword},
    {
      new: true,
      runValidators: true,
    }
  )
  if (!user) {
    return next(new ApiError(`There is no user with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success", data: user });
});

export { getAllUsers, getSpecificUser,activateSpecificUser, createUser, updateUser, deleteUser , changeUserPassword};
