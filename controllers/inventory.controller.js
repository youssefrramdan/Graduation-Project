// eslint-disable-next-line import/no-extraneous-dependencies
import asyncHandler from "express-async-handler";
import InventoryModel from "../models/Inventory.model.js";
import ApiError from "../utils/apiError.js";

/**
 * @desc    Get all inventories
 * @route   GET /api/v1/inventories
 * @access  Private
 */
const getAllInventories = asyncHandler(async (req, res) => {
  const countDocuments = await InventoryModel.countDocuments();

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

  let mongooseQuery = InventoryModel.find().skip(skip).limit(limit);

  if (req.query.keyword) {
    mongooseQuery = InventoryModel.find({
      storageName: { $regex: req.query.keyword, $options: "i" },
    })
      .skip(skip)
      .limit(limit);
  }

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  const inventories = await mongooseQuery;

  res.status(200).json({
    message: "success",
    pagination,
    result: inventories.length,
    data: inventories,
  });
});

/**
 * @desc    Get specific inventory by ID
 * @route   GET /api/v1/inventories/:id
 * @access  Private
 */
const getSpecificInventory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const inventory = await InventoryModel.findById(id);
  if (!inventory) {
    return next(new ApiError(`No inventory found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: inventory });
});

/**
 * @desc    Create a new inventory
 * @route   POST /api/v1/inventories
 * @access  Private
 */
const createInventory = asyncHandler(async (req, res) => {
  console.log(req.file);

  if (req.file) {
    req.body.licenseDocument = req.file.path;
  }
  const inventory = await InventoryModel.create(req.body);
  res.status(201).json({ message: "success", data: inventory });
});

/**
 * @desc    Update an existing inventory
 * @route   PUT /api/v1/inventories/:id
 * @access  Private
 */
const updateInventory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const inventory = await InventoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!inventory) {
    return next(new ApiError(`No inventory found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: inventory });
});

/**
 * @desc    Delete an existing inventory
 * @route   DELETE /api/v1/inventories/:id
 * @access  Private
 */
const deleteInventory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const inventory = await InventoryModel.findByIdAndDelete(id);
  if (!inventory) {
    return next(new ApiError(`No inventory found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: inventory });
});

export {
  getAllInventories,
  getSpecificInventory,
  createInventory,
  updateInventory,
  deleteInventory,
};
