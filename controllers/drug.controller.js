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
 * @desc    Get all drugs with advanced filtering, sorting, pagination, and searching.
 * @route   GET /api/v1/drugs
 * @access  Public
 */
const getAllDrugs = asyncHandler(async (req, res, next) => {
  const countDocuments = await DrugModel.countDocuments();
  const apiFeatures = new ApiFeatures(DrugModel.find(), req.query)
    .paginate(countDocuments)
    .filter()
    .dateFilters()
    .sort()
    .search()
    .limitFields();

  const { mongooseQuery, paginationResult } = apiFeatures;
  const drugs = await mongooseQuery;

  res.status(200).json({
    status: "success",
    paginationResult,
    results: drugs.length,
    data: drugs,
  });
});

/**
 * @desc    Get a specific drug by its ID.
 * @route   GET /api/v1/drugs/:id
 * @access  Public
 */
const getSpecificDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const drug = await DrugModel.findById(id);
  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }
  res.status(200).json({ message: "success", data: drug });
});

/**
 * @desc    Add a new drug.
 * @route   POST /api/v1/drugs
 * @access  Private (Authenticated users only)
 */
const addDrug = asyncHandler(async (req, res, next) => {
  let imageCoverUrl = req.file?.path || "";
  const drugData = { 
    ...req.body,
    createdBy: req.user._id,
    imageCover: imageCoverUrl,
  };
  const drug = await DrugModel.create(drugData);
  res.status(201).json({ message: "success", data: drug });
});

/**
 * @desc    Update a specific drug by its ID.
 * @route   PUT /api/v1/drugs/:id
 * @access  Private (Authenticated users only)
 */
const updateDrug = asyncHandler(async (req, res, next) => {
  let updatedData = { ...req.body };
  if (req.file) {
    updatedData.imageCover = req.file.path;
  }
  const { id } = req.params;
  const drug = await DrugModel.findOneAndUpdate({ _id: id }, updatedData, {
    new: true,
    runValidators: true,
  });

  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }
  res.status(200).json({ message: "success", data: drug });
});

/**
 * @desc    Delete a specific drug by its ID.
 * @route   DELETE /api/v1/drugs/:id
 * @access  Private (Authenticated users only)
 */
const deleteDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const drug = await DrugModel.findByIdAndDelete(id);

  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }

  res.status(200).json({ message: "success" });
});

/**
 * @desc    Add drugs from an Excel file.
 * @route   POST /api/v1/drugs/from-excel
 * @access  Private (Authenticated users only)
 */
const addDrugsFromExcel = asyncHandler(async (req, res, next) => {
  let filePath = req.selectedFilePath;  

  if (!filePath && req.file?.path) {
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
  }

  if (!filePath) {
    return next(new ApiError("Please provide a fileId or upload a new Excel file.", 400));
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
