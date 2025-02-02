/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";

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

  let mongooseQuery = UserModel.find(filter)
    .skip(skip)
    .limit(limit)
    .lean();

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
 * @desc    Create a new user 
 * @route   POST /api/v1/users
 * @access  Private
 */
const createUser = asyncHandler(async (req, res, next) => {
  const existingUser = await UserModel.findOne({
    $or: [
      { email: req.body.email },
      { phone: req.body.phone },
      { identificationNumber: req.body.identificationNumber },
      { registrationNumber: req.body.registrationNumber },
    ],
  });

  if (existingUser) {
    return next(
      new ApiError(
        "Some data is already in use. Please check the entered information.",
        400
      )
    );
  }
  if (!req.file.path) {
  return next(new ApiError("Please Send licenseDocument ..."))
  }
  req.body.licenseDocument = req.file.path;

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

  const user = await UserModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password -__v");

  if (!user) {
    return next(new ApiError(`There isnt user for this ${id}`, 404));
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

export { getAllUsers, getSpecificUser, createUser, updateUser, deleteUser };
