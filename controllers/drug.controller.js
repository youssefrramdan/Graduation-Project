/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-const */
/* eslint-disable node/no-unsupported-features/es-syntax */
import asyncHandler from "express-async-handler";
import xlsx from "xlsx";
import DrugModel from "../models/Drug.model.js";
import ApiError from "../utils/apiError.js";
import { ApiFeatures } from "../utils/apiFeatures.js";

/**
 * @desc    Get all drugs
 * @route   GET /api/drugs?price[gte]=100&price[lte]=500&expirationDate[gte]=2024-06-01
 * @route   GET /api/drugs?productionDate[gte]=2023-01-01&expirationDate[lte]=2025-12-31
 * @access  Public
 */

const getAllDrugs = asyncHandler(async (req, res, next) => {

  // Build the query
  const countDocuments = await DrugModel.countDocuments();
  const apiFeatures = new ApiFeatures(DrugModel.find(),req.query)
    .paginate(countDocuments)
    .filter()
    .dateFilters()
    .sort()
    .search()
    .limitFields();

  // Execute the query
  const {mongooseQuery, paginationResult} = apiFeatures;
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
  const {id} = req.params;
  const drug = await DrugModel.findById(id);
  if(!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }
  res.status(201).json({message: "success", data: drug});
});

/**
 * @desc    Add Drug
 * @route   post /api/v1/drugs
 * @access  private
 */

const addDrug = asyncHandler(async (req, res, next) => {
  // Add createdBy to req.body
  const drugData = {...req.body, createdBy: req.user._id};
  const drug = await DrugModel.create(drugData);
  res.status(201).json({message: "success", data: drug });
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
  res.status(201).json({message: "success", data: drug });
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

  res.status(200).json({ message: "success"});
});

const addDrugsFromExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Please upload an Excel file." });
    }

    console.log(req.file.path);

    // تحميل الملف من Cloudinary
    const fileUrl = req.file.path;

    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    let data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const startRow = Number(req.query.startRow) || 0;
    const endRow = Number(req.query.endRow) || data.length;

    if (startRow < 0 || endRow > data.length || startRow >= endRow) {
      return res.status(400).json({
        status: "error",
        message: "Invalid startRow or endRow values.",
      });
    }

    data = data.slice(startRow, endRow);

    const formattedData = data.map((item) => ({
      name: item.name,
      manufacturer: item.manufacturer || "",
      description: item.description || "",
      originType: item.originType,
      productionDate: new Date(item.productionDate),
      expirationDate: new Date(item.expirationDate),
      price: item.price,
      discount: item.discount || 0,
      discountedPrice:
        item.discountedPrice ||
        item.price - (item.price * (item.discount || 0)) / 100,
      stock: item.stock,
      sold: item.sold || 0,
      isVisible: item.isVisible === "TRUE",
      imageCover: item.imageCover ? item.imageCover.split(",") : [],
      createdBy: req.user._id,
    }));

    // إدخال البيانات في قاعدة البيانات
    await DrugModel.insertMany(formattedData);

    res.status(200).json({
      status: "success",
      message: `Drugs added successfully from row ${startRow} to ${endRow}! Rows added: ${formattedData.length}`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export { addDrug, getAllDrugs, addDrugsFromExcel, getSpecificDrug, updateDrug, deleteDrug };
