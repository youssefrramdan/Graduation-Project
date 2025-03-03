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
import { query } from "express";

/**
 * @desc    Get all drugs with advanced filtering, sorting, pagination, and searching.
 * @route   GET /api/v1/drugs
 * @access  Public
 */
const getAllDrugs = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.location || !req.user.location.coordinates) {
    return next(new Error("Pharmacy location not found"));
  }
  const pharmacyLocation = req.user.location.coordinates;

  // Base aggregation pipeline for geospatial search
  const baseQuery = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: pharmacyLocation },
        spherical: true,
        distanceField: "calcDistance",
        query: {
          role: "inventory",
        },
      },
    },
    {
      $lookup: {
        from: "drugs",
        localField: "_id",
        foreignField: "createdBy",
        as: "drugs",
      },
    },
    { $unwind: "$drugs" },

    {
      $lookup: {
        from: "users", // اسم الـ collection الخاص بالمستخدمين
        localField: "drugs.createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
  ];

  // Create API features instance with aggregation support
  const features = new ApiFeatures(
    UserModel.aggregate(baseQuery),
    req.query,
    true
  )
    .filter()
    .sort()
    .limitFields()
    .search()
    .dateFilters();

  // Get pipeline stages from features
  const pipeline = [...baseQuery, ...features.getPipeline()];

  // Get total count before pagination
  const countPipeline = [...pipeline];
  const totalCount = (await UserModel.aggregate(countPipeline)).length;

  // Apply pagination and get final pipeline
  features.paginate(totalCount);
  const finalPipeline = [
    ...pipeline,
    ...features.getPipeline().slice(pipeline.length),
  ];

  // Execute final query
  const drugs = await UserModel.aggregate(finalPipeline);

  res.status(200).json({
    status: "success",
    paginationResult: features.paginationResult,
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
  // 1. تأكد إن المستخدم مخزن
  if (req.user.role !== "inventory") {
    return next(new ApiError("Only inventories can add drugs", 403));
  }

  // let imageCoverUrl = req.file?.path || "";
  // imageCover: imageCoverUrl,

  const drugData = {
    ...req.body,
    createdBy: req.user._id,
  };

  // 2. أنشئ الدواء
  const drug = await DrugModel.create(drugData);

  // 3. أضف الدواء للمخزن
  await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      $push: { drugs: drug._id },
    },
    { new: true }
  );

  res.status(201).json({
    status: "success",
    message: "Drug added successfully to your inventory",
    data: drug,
  });
});

/**
 * @desc    Update a specific drug by its ID.
 * @route   PUT /api/v1/drugs/:id
 * @access  Private (Authenticated users only)
 */
const updateDrug = asyncHandler(async (req, res, next) => {
  let updatedData = { ...req.body };
  // if (req.file) {
  //   updatedData.imageCover = req.file.path;
  // }
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
 * @access  Private (Inventory only)
 */
const addDrugsFromExcel = asyncHandler(async (req, res, next) => {
  // 1. تأكد إن المستخدم مخزن
  if (req.user.role !== "inventory") {
    return next(new ApiError("Only inventories can add drugs", 403));
  }

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
    return next(
      new ApiError("Please provide a fileId or upload a new Excel file.", 400)
    );
  }

  // 2. اقرأ وتحقق من الملف
  const data = await readExcelFile(filePath);
  const startRow = Number(req.body.startRow) || 0;
  const endRow = Number(req.body.endRow) || 40;

  validateRowRange({ startRow, endRow }, data.length);

  const slicedData = data.slice(startRow, endRow);
  const formattedData = formatDrugData(slicedData, req.user._id);

  // 3. أنشئ الأدوية
  const drugs = await DrugModel.insertMany(formattedData);

  // 4. أضف كل الأدوية للمخزن
  await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      $push: {
        drugs: {
          $each: drugs.map((drug) => drug._id),
        },
      },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    message: `${drugs.length} drugs added successfully to your inventory!`,
    data: {
      drugsCount: drugs.length,
      drugs: drugs,
      filePath,
    },
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
