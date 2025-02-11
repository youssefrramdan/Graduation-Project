/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-const */
/* eslint-disable node/no-unsupported-features/es-syntax */
import asyncHandler from "express-async-handler";
import DrugModel from "../models/Drug.model.js";
import ApiError from "../utils/apiError.js";
import { ApiFeatures } from "../utils/apiFeatures.js";
import {
  readExcelFile,
  validateRowRange,
  formatDrugData,
} from "../utils/excelUtils.js";
import UserModel from "../models/User.model.js";

/**
 * @desc    Get all drugs
 * @route   GET /api/drugs?price[gte]=100&price[lte]=500&expirationDate[gte]=2024-06-01
 * @route   GET /api/drugs?productionDate[gte]=2023-01-01&expirationDate[lte]=2025-12-31
 * @access  Public
 */

const getAllDrugs = asyncHandler(async (req, res, next) => {
  // Build the query
  const countDocuments = await DrugModel.countDocuments();
  const apiFeatures = new ApiFeatures(DrugModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .dateFilters()
    .sort()
    .search()
    .limitFields();

  // Execute the query
  const { mongooseQuery, paginationResult } = apiFeatures;
  const drugs = await mongooseQuery;

  // Return the response
  res.status(200).json({
    status: "success",
    paginationResult,
    results: drugs.length,
    data: drugs,
  });
});

/**
 * @desc    Get specific drug by ID
 * @route   GET /api/v1/drugs/:id
 * @access  Public
 */

const getSpecificDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const drug = await DrugModel.findById(id);
  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }
  res.status(201).json({ message: "success", data: drug });
});

/**
 * @desc    Add Drug
 * @route   post /api/v1/drugs
 * @access  private
 */

const addDrug = asyncHandler(async (req, res, next) => {
  // Add createdBy to req.body
  const drugData = { ...req.body, createdBy: req.user._id };
  const drug = await DrugModel.create(drugData);
  res.status(201).json({ message: "success", data: drug });
});

/**
 * @desc    Update specific drug
 * @route   post /api/v1/drugs/:id
 * @access  private
 */

const updateDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const drug = await DrugModel.findOneAndUpdate({ _id: id }, req.body, {
    new: true,
    runValidators: true,
  });

  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }
  res.status(201).json({ message: "success", data: drug });
});

/**
 * @desc    Delete specific drug
 * @route   DELETE /api/v1/drugs/:id
 * @access  Private
 */
const deleteDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const drug = await DrugModel.findByIdAndDelete(id);

  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success" });
});
const addDrugsFromExcel = asyncHandler(async (req, res) => {
  let filePath;
  // Determine if the user wants to use an existing file or upload a new one
  if (req.body.fileId) {
    // Use an existing file
    const user = await UserModel.findById(req.user._id).select("files");
    const selectedFile = user.files.find(
      (file) => file._id.toString() === req.body.fileId
    );

    if (!selectedFile) {
      return res.status(404).json({ message: "File not found in your files." });
    }

    filePath = selectedFile.fileUrl;
  } else if (req.file?.path) {
    // Upload a new file
    filePath = req.file.path;

    // Save the new file in the user's files array
    await UserModel.findByIdAndUpdate(req.user._id, {
      $push: {
        files: {
          fileName: req.file.originalname,
          fileUrl: req.file.path,
          uploadedAt: new Date(),
        },
      },
    });
  } else {
    return res
      .status(400)
      .json({ message: "Please provide a fileId or upload a new Excel file." });
  }

  // Process the file and insert data
  const data = await readExcelFile(filePath);
  const startRow = Number(req.body.startRow) || 0;
  const endRow = Number(req.body.endRow) || 40;

  validateRowRange({ startRow, endRow }, data.length);

  const slicedData = data.slice(startRow, endRow);
  const formattedData = formatDrugData(slicedData, req.user._id);

  await DrugModel.insertMany(formattedData);

  res.status(200).json({
    status: "success",
    message: `Drugs added successfully from row ${startRow} to ${endRow}! Rows added: ${formattedData.length}`,
    filePath,
  });
});
export {
  addDrug,
  getAllDrugs,
  addDrugsFromExcel,
  getSpecificDrug,
  updateDrug,
  deleteDrug,
};
