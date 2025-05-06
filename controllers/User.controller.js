import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

import { sendEmail } from "../middlewares/sendEmail.js";
import DrugModel from "../models/Drug.model.js";
import orderModel from "../models/order.model.js";

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

  await UserModel.findByIdAndDelete(user._id);

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
  const keyword = req.query.keyword || "";
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
      $match: {
        name: { $regex: keyword, $options: "i" },
      },
    },
    {
      $project: {
        profileImage: 1,
        name: 1,
        location: 1,
        ownerName: 1,
        shippingPrice: 1,
        minimumOrderValue: 1,
        phone: 1,
        identificationNumber: 1,
        registrationNumber: 1,
        city: 1,
        governorate: 1,
        DistanceInKm: { $divide: ["$calcDistance", 1000] },
      },
    },
  ]);
  res.status(200).json({ message: "success", inventories });
});

/**
 * @desc    Add inventory to pharmacy favourite
 * @route   POST /api/v1/users/favourite/:inventoryId
 * @access  Private
 */
const addToFavourite = asyncHandler(async (req, res, next) => {
  const pharmacyId = req.user._id;
  const { inventoryId } = req.params;
  const pharmacy = await UserModel.findById(pharmacyId);
  const inventory = await UserModel.findById(inventoryId);

  if (!inventory || inventory.role !== "inventory") {
    return next(new ApiError("Inventory not found", 404));
  }
  if (pharmacy.favourite.includes(inventoryId)) {
    return next(new ApiError("Inventory already in favourite", 400));
  }

  pharmacy.favourite.push(inventoryId);
  await pharmacy.save();

  res.status(200).json({
    status: "success",
    message: "Inventory added to favourite",
    data: pharmacy.favourite,
  });
});

/**
 * @desc    Remove inventory from pharmacy favourite
 * @route   DELETE /api/v1/users/favourite/:inventoryId
 * @access  Private (Pharmacy)
 */

const removeFromFavourite = asyncHandler(async (req, res, next) => {
  const pharmacyId = req.user._id;
  const { inventoryId } = req.params;
  const pharmacy = await UserModel.findById(pharmacyId);
  const index = pharmacy.favourite.indexOf(inventoryId);
  if (index === -1) {
    return next(new ApiError("Inventory not found in favourite", 404));
  }

  pharmacy.favourite.splice(index, 1);
  await pharmacy.save();

  res.status(200).json({
    status: "success",
    message: "Inventory removed from favourite",
    data : pharmacy.favourite,
  });
});


/**
 * @desc    Get all inventories in pharmacy favourite
 * @route   GET /api/v1/users/favourite
 * @access  Private (Pharmacy)
 */

const getMyFavourite = asyncHandler(async (req, res, next) => {
  const pharmacyId = req.user._id;
  const pharmacy = await UserModel.findById(pharmacyId);
  const inventories = await UserModel.find(
    {
      _id: { $in: pharmacy.favourite },
      role: "inventory",
    },
    {
      _id: 1,
      name: 1,
      ownerName: 1,
      minimumOrderValue :1,
      phone: 1,
      profileImage: 1,
      city: 1,
      governorate: 1,
      shippingPrice: 1,
    }
  );

  res.status(200).json({
    message: "success",
    data:inventories,
  });
});

/**
 * @desc    Get user statistics for admin dashboard
 * @route   GET /api/v1/users/statistics
 * @access  Private (Admin)
 */

const getAdminStatistics = asyncHandler(async (req, res, next) => {
  const totalUsers = await UserModel.countDocuments();
  const totalPharmacies = await UserModel.countDocuments({ role: "pharmacy" });
  const totalInventories = await UserModel.countDocuments({ role: "inventory" });

  const verifiedUsers = await UserModel.countDocuments({ isVerified: true });
  const unverifiedUsers = await UserModel.countDocuments({ isVerified: false });

  const activeUsers = await UserModel.countDocuments({ active: true });
  const inactiveUsers = await UserModel.countDocuments({ active: false });

  const orderStats = await orderModel.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalPrices: { $sum: "$pricing.total" }
      }
    }
  ]);

  const totalOrders = orderStats[0]?.totalOrders || 0;
  const totalPrices = orderStats[0]?.totalPrices || 0;

// Top 10 Inventories
const topInventories = await orderModel.aggregate([
  {
    $group: {
      _id: "$inventory",
      totalSales: { $sum: "$pricing.total" },
      orderCount: { $sum: 1 }
    }
  },
  { $sort: { totalSales: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "users",
      let: { inventoryId: "$_id" },
      pipeline: [
        { $match: {
            $expr: { $eq: ["$_id", "$$inventoryId"] },
            role: "inventory"
        }}
      ],
      as: "inventoryInfo"
    }
  },
  {
    $unwind: "$inventoryInfo"
  },
  {
    $project: {
      _id: 1,
      totalSales: 1,
      orderCount: 1,
      inventoryName: "$inventoryInfo.name",
      email: "$inventoryInfo.email",      
      phone: "$inventoryInfo.phone",      
      address: "$inventoryInfo.address", 
    }
  }
]);


  res.status(200).json({
    status: "success",
    data: {
      totalUsers,
      totalPharmacies,
      totalInventories,
      verifiedUsers,
      unverifiedUsers,
      activeUsers,
      inactiveUsers,
      totalOrders,
      totalPrices,
      topInventories,
    },
  });
});





export {
  getAllUsers,
  getSpecificUser,
  activateSpecificUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getMe,
  updateMyPassword,
  updateMe,
  updateUserImage,
  deactivateMe,
  activateMe,
  getNearestInventories,
  getMyFavourite,
  addToFavourite,
  removeFromFavourite,
  getAdminStatistics,
};
