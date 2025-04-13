/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";
import { sendEmail } from "../middlewares/sendEmail.js";
import ApiFeatures from "../utils/apiFeatures.js";
import axios from "axios";
import DrugModel from "../models/Drug.model.js";

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
    if (!coordinates.some(isNaN)) {
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
  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    return next(new ApiError(`There isn't a user for this ${id}`, 404));
  }

  res.status(200).json({ message: "success", user: user });
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

const getAlternativeDrugsFromAI = asyncHandler(async (req, res, next) => {
  const { medicine } = req.body;
  try {
    const response = await axios.post(
      "https://mid-sosanna-youssef-ramadan-68a825b9.koyeb.app/recommend",
      {
        medicine: medicine,
      }
    );
    const recommendedMedicines = response.data.recommended_medicines || [];

    if (!recommendedMedicines.length) {
      return res.status(404).json({ message: "No alternatives found from AI" });
    }

    const drugNames = recommendedMedicines.map((med) => med.trim());

    const drugs = await DrugModel.find({
      name: {
        $in: drugNames.map((name) => new RegExp(`^${name.trim()}$`, "i")),
      },
    }).populate({
      path: "createdBy",
      select: "name",
    });

    const result = drugs.map((drug) => ({
      inventory: {
        id: drug.createdBy?._id,
        name: drug.createdBy?.name,
      },
      id: drug._id,
      name: drug.name,
      manufacturer: drug.manufacturer,
      description: drug.description,
      price: drug.price,
      discount: drug.discount,
      discountedPrice: drug.discountedPrice,
      stock: drug.stock,
      productionDate: drug.productionDate,
      expirationDate: drug.expirationDate,
      imageCover: drug.imageCover,
    }));

    res.status(200).json({ message: "success", drugs: result });
  } catch (error) {
    console.error("Error fetching alternatives from AI:", error);
    next(new Error("Failed to fetch alternatives from AI"));
  }
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
  getAlternativeDrugsFromAI,
};

// 🔹 $geometry هو المشغل الذي يحدد نوع الشكل الجغرافي (Point, Polygon, LineString) وإحداثياته (coordinates).
// 📌 بدون $geometry، لن يفهم MongoDB أن هذا كائن GeoJSON، وسيرفض الاستعلام.

// const inventories = await UserModel.find({
//   role: "inventory", // تصفية النتائج بناءً على الدور
//   location: {
//     $near: {
//       $geometry: {
//         type: "Point",
//         coordinates: userCoordinates, // إحداثيات المستخدم
//       },
//       $maxDistance: 10000, // الحد الأقصى للمسافة (10 كم)
//       $minDistance: 500  // الحد الأدنى للمسافة (500 متر)
//     }
//   }
// });

//! ده غلط
// const inventories = await UserModel.find({
//   location: {
//     $geoNear: {
//       near: { type: "Point", coordinates: userCoordinates },
//       spherical: true,
//       query: { role: "inventory" },
//       distanceField: "calcDistance",
//     },
//   },
// });

//!! ده صح
// $near مع find()
//  إذا كنت تحتاج فقط إلى البحث عن أقرب الأماكن بدون ترتيب دقيق أو عمليات إضافية.

// const inventories = await UserModel.aggregate([
//   {
//     $geoNear: {
//       near: { type: "Point", coordinates: userCoordinates }, // ❌ `$geometry` غير مطلوب هنا
//       spherical: true,
//       query: { role: "inventory" },
//       distanceField: "calcDistance",
//       maxDistance: 10000
//     }
//   }
// ]);
