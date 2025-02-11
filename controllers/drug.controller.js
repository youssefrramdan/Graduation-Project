/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-const */
/* eslint-disable node/no-unsupported-features/es-syntax */
import asyncHandler from "express-async-handler";
import xlsx from "xlsx";
import DrugModel from "../models/Drug.model.js";
import ApiError from "../utils/apiError.js";

/**
 * @desc    Get all drugs
 * @route   GET /api/drugs?price[gte]=100&price[lte]=500&expirationDate[gte]=2024-06-01
 * @route   GET /api/drugs?productionDate[gte]=2023-01-01&expirationDate[lte]=2025-12-31
 * @access  Public
 */

const getAllDrugs = asyncHandler(async (req, res) => {
  // 1) Filtering
  const query = { ...req.query };
  const excludedFields = ["page", "limit", "skip", "sort", "keyword", "fields"];
  excludedFields.forEach((field) => delete query[field]);

  let queryStr = JSON.stringify(query);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
  let filters = JSON.parse(queryStr);

  // 2) Keyword Search (Adding to filters)
  if (req.query.keyword) {
    filters.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { description: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  // 3) Date Filtering (Adding productionDate & expirationDate filters)
  if (req.query.productionDate) {
    filters.productionDate = {};
    if (req.query.productionDate.gte)
      filters.productionDate.$gte = new Date(req.query.productionDate.gte);
    if (req.query.productionDate.lte)
      filters.productionDate.$lte = new Date(req.query.productionDate.lte);
  }

  if (req.query.expirationDate) {
    filters.expirationDate = {};
    if (req.query.expirationDate.gte)
      filters.expirationDate.$gte = new Date(req.query.expirationDate.gte);
    if (req.query.expirationDate.lte)
      filters.expirationDate.$lte = new Date(req.query.expirationDate.lte);
  }

  // 4) Pagination
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const skip = (page - 1) * limit;
  const countDocuments = await DrugModel.countDocuments(filters);

  const pagination = {
    currentPage: page,
    resultsPerPage: limit,
    totalPages: Math.ceil(countDocuments / limit),
  };
  if (page * limit < countDocuments) pagination.nextPage = page + 1;
  if (page > 1) pagination.previousPage = page - 1;

  // 5) Build the query
  let mongooseQuery = DrugModel.find(filters).skip(skip).limit(limit);

  // 6) Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  // 7) Field selection
  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    mongooseQuery = mongooseQuery.select(fields);
  } else {
    mongooseQuery = mongooseQuery.select("-__v");
  }

  // 8) Execute the query
  const drugs = await mongooseQuery;

  // 9) Return the response
  res.status(200).json({
    status: "success",
    pagination,
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
