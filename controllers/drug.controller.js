/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-const */
/* eslint-disable node/no-unsupported-features/es-syntax */
import asyncHandler from "express-async-handler";
import DrugModel from "../models/Drug.model.js";
import ApiError from "../utils/apiError.js";
import {
  readExcelFile,
  validateRowRange,
  formatDrugData,
} from "../utils/excelUtils.js";
import UserModel from "../models/User.model.js";

/**
 * @desc    Get all drugs with filtering, sorting, and pagination
 * @route   GET /api/v1/drugs
 * @access  Public
 */
const getAllDrugs = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.location || !req.user.location.coordinates) {
    return next(new Error("Pharmacy location not found"));
  }

  const pharmacyLocation = req.user.location.coordinates;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const skip = (page - 1) * limit;

  // Build the aggregation pipeline
  // adding isVisible 
  const pipeline = [
    // Find nearby inventories
    {
      $geoNear: {
        near: { type: "Point", coordinates: pharmacyLocation },
        spherical: true,
        distanceField: "calcDistance",
        // query: { role: "inventory" },
      },
    },
    // Get drugs from each inventory
    {
      $lookup: {
        from: "drugs",
        localField: "_id",
        foreignField: "createdBy",
        as: "drugs",
      },
    },
    // Unwind drugs array to get individual drugs
    { $unwind: "$drugs" },
    // Get inventory details
    {
      $lookup: {
        from: "users",
        localField: "drugs.createdBy",
        foreignField: "_id",
        as: "inventory",
      },
    },
    // Unwind inventory array
    { $unwind: "$inventory" },
  ];

  // Add filters if they exist
  const filters = {};
  if (req.query.keyword) {
    filters.$or = [
      { "drugs.name": { $regex: req.query.keyword, $options: "i" } },
      { "drugs.description": { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  // Add price filter
  if (req.query.price) {
    filters["drugs.price"] = {};
    if (req.query.price.gte)
      filters["drugs.price"].$gte = Number(req.query.price.gte);
    if (req.query.price.lte)
      filters["drugs.price"].$lte = Number(req.query.price.lte);
  }

  // Add stock filter
  if (req.query.stock) {
    filters["drugs.stock"] = {};
    if (req.query.stock.gte)
      filters["drugs.stock"].$gte = Number(req.query.stock.gte);
    if (req.query.stock.lte)
      filters["drugs.stock"].$lte = Number(req.query.stock.lte);
  }

  // Add date filters
  if (req.query.productionDate) {
    filters["drugs.productionDate"] = {};
    if (req.query.productionDate.gte)
      filters["drugs.productionDate"].$gte = new Date(
        req.query.productionDate.gte
      );
    if (req.query.productionDate.lte)
      filters["drugs.productionDate"].$lte = new Date(
        req.query.productionDate.lte
      );
  }

  if (req.query.expirationDate) {
    filters["drugs.expirationDate"] = {};
    if (req.query.expirationDate.gte)
      filters["drugs.expirationDate"].$gte = new Date(
        req.query.expirationDate.gte
      );
    if (req.query.expirationDate.lte)
      filters["drugs.expirationDate"].$lte = new Date(
        req.query.expirationDate.lte
      );
  }

  // Add filters to pipeline if they exist
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }

  // Add sorting
  const sortStage = {};
  if (req.query.sort) {
    const sortFields = req.query.sort.split(",");
    sortFields.forEach((field) => {
      if (field.startsWith("-")) {
        sortStage[`drugs.${field.slice(1)}`] = -1;
      } else {
        sortStage[`drugs.${field}`] = 1;
      }
    });
  } else {
    sortStage.calcDistance = 1; // Default sort by distance
  }
  pipeline.push({ $sort: sortStage });

  // Project only needed fields
  const projectStage = {
    _id : "$drugs._id",
    name: "$drugs.name",
    manufacturer: "$drugs.manufacturer",
    description: "$drugs.description",
    price: "$drugs.price",
    discount: "$drugs.discount",
    discountedPrice: "$drugs.discountedPrice",
    stock: "$drugs.stock",
    productionDate: "$drugs.productionDate",
    expirationDate: "$drugs.expirationDate",
    imageCover: "$drugs.imageCover",
    distanceInKm: { $divide: ["$calcDistance", 1000] },
    inventory: {
      _id: "$inventory._id",
      name: "$inventory.name",
      profileImage: "$inventory.profileImage",
    },
  };

  if (req.query.fields) {
    const fields = req.query.fields.split(",");
    const projection = {};
    fields.forEach((field) => {
      if (projectStage[field]) {
        projection[field] = projectStage[field];
      }
    });
    // Always include inventory info and distance
    projection.inventory = projectStage.inventory;
    projection.distanceInKm = projectStage.distanceInKm;
    pipeline.push({ $project: projection });
  } else {
    pipeline.push({ $project: projectStage });
  }

  // Get total count
  const countPipeline = [...pipeline];
  const totalCount = (await UserModel.aggregate(countPipeline)).length;

  // Add pagination
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Execute query
  const drugs = await UserModel.aggregate(pipeline);

  // Prepare response
  const paginationResult = {
    currentPage: page,
    limit,
    numberOfPages: Math.ceil(totalCount / limit),
  };

  if (skip + limit < totalCount) paginationResult.next = page + 1;
  if (skip > 0) paginationResult.prev = page - 1;

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
  if (req.user.role !== "inventory") {
    return next(new ApiError("Only inventories can add drugs", 403));
  }

  const drugData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const drug = await DrugModel.create(drugData);

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

const updateDrugImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(`Please upload Drug image`, 404));
  }
  req.body.imageCover = req.file.path;

  const { id } = req.params;
  const drug = await DrugModel.findOneAndUpdate({ _id: id }, req.body, {
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

  // 2. Read and validate the file
  const data = await readExcelFile(filePath);
  const startRow = Number(req.body.startRow) || 0;
  const endRow = Number(req.body.endRow) || 40;

  validateRowRange({ startRow, endRow }, data.length);

  const slicedData = data.slice(startRow, endRow);
  const { validDrugs, invalidDrugs } = formatDrugData(slicedData, req.user._id);

  // 3. Create valid drugs only
  const drugs =
    validDrugs.length > 0 ? await DrugModel.insertMany(validDrugs) : [];

  // 4. Add all drugs to the inventory
  if (drugs.length > 0) {
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
  }

  res.status(200).json({
    status: "success",
    message: `${drugs.length} drugs added successfully to your inventory!`,
    data: {
      drugsCount: drugs.length,
      drugs: drugs,
      invalidDrugs: invalidDrugs.length > 0 ? invalidDrugs : undefined,
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
  updateDrugImage,
  deleteDrug,
};
