/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-const */
/* eslint-disable node/no-unsupported-features/es-syntax */
import asyncHandler from "express-async-handler";
import DrugModel from "../models/Drug.model.js";
import UserModel from "../models/User.model.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import {
  readExcelFile,
  validateRowRange,
  formatDrugData,
} from "../utils/excelUtils.js";
import axios from "axios";

// ======== Helper Functions ========

/**
 * Create filter stages for queries
 */
const createFilterStages = (query) => {
  const filters = {};

  // Add search filters
  if (query.keyword) {
    // Add search filters
    if (query.keyword) {
      // Split the keyword into individual words
      const keywords = query.keyword
        .split(/\s+/)
        .filter((word) => word.length > 0);

      if (keywords.length > 0) {
        // Create an array of conditions for each field and each keyword
        const conditions = [];

        // For each field we want to search
        const fieldsToSearch = [
          "drugs.name",
          "drugs.description",
          "drugs.manufacturer",
          "drugs.originType",
        ];

        fieldsToSearch.forEach((field) => {
          // For each keyword, create a regex condition
          keywords.forEach((keyword) => {
            conditions.push({ [field]: { $regex: keyword, $options: "i" } });
          });
        });

        // Add the OR conditions to the filter
        filters.$or = conditions;
      }
    }
  }

  // Add price filter
  if (query.price) {
    filters["drugs.price"] = {};
    if (query.price.gte) filters["drugs.price"].$gte = Number(query.price.gte);
    if (query.price.lte) filters["drugs.price"].$lte = Number(query.price.lte);
  }

  // Add stock filter
  if (query.stock) {
    filters["drugs.stock"] = {};
    if (query.stock.gte) filters["drugs.stock"].$gte = Number(query.stock.gte);
    if (query.stock.lte) filters["drugs.stock"].$lte = Number(query.stock.lte);
  }

  // Add date filters
  if (query.productionDate) {
    filters["drugs.productionDate"] = {};
    if (query.productionDate.gte)
      filters["drugs.productionDate"].$gte = new Date(query.productionDate.gte);
    if (query.productionDate.lte)
      filters["drugs.productionDate"].$lte = new Date(query.productionDate.lte);
  }

  if (query.expirationDate) {
    filters["drugs.expirationDate"] = {};
    if (query.expirationDate.gte)
      filters["drugs.expirationDate"].$gte = new Date(query.expirationDate.gte);
    if (query.expirationDate.lte)
      filters["drugs.expirationDate"].$lte = new Date(query.expirationDate.lte);
  }

  return filters;
};

/**
 * Create projection stage for queries
 */
const createProjectStage = (query) => {
  const defaultProjection = {
    _id: "$drugs._id",
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

  if (!query.fields) return defaultProjection;

  const fields = query.fields.split(",");
  const projection = {};

  // Optimization: More efficient way to add only required fields
  for (const field of fields) {
    if (defaultProjection[field]) {
      projection[field] = defaultProjection[field];
    }
  }

  // Always include inventory and distance information
  projection.inventory = defaultProjection.inventory;
  projection.distanceInKm = defaultProjection.distanceInKm;

  return projection;
};

/**
 * Create sort stage
 */
const createSortStage = (query) => {
  const sortStage = {};
  if (query.sort) {
    const sortFields = query.sort.split(",");
    for (const field of sortFields) {
      if (field.startsWith("-")) {
        sortStage[`drugs.${field.slice(1)}`] = -1;
      } else {
        sortStage[`drugs.${field}`] = 1;
      }
    }
  } else {
    sortStage.calcDistance = 1;
  }
  return sortStage;
};

/**
 * Execute aggregation pipeline
 */
const executeAggregationPipeline = async (pipeline, skip, limit) => {
  // Copy pipeline for count
  const countPipeline = [...pipeline];

  // Add count aggregation - more efficient than re-running full query
  countPipeline.push({ $count: "totalCount" });

  // Add pagination to original query
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  // Execute queries in parallel
  const [countResult, drugs] = await Promise.all([
    UserModel.aggregate(countPipeline),
    UserModel.aggregate(pipeline),
  ]);

  const totalCount =
    countResult[0] && countResult[0].totalCount ? countResult[0].totalCount : 0;

  return { totalCount, drugs };
};

// ======== Controller Functions ========
// [list from ai]--> drugs ----> drugs with location
/**
 * @desc    Get all drugs with filtering, sorting and pagination - Performance optimized
 * @route   GET /api/v1/drugs
 * @access  Public
 */
const getAllDrugs = asyncHandler(async (req, res, next) => {
  const pharmacyLocation = req.user.location.coordinates;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: pharmacyLocation },
        spherical: true,
        distanceField: "calcDistance",
        query: {},
        distanceMultiplier: 0.001,
      },
    },
    {
      $lookup: {
        from: "drugs",
        let: { inventoryId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$createdBy", "$$inventoryId"] } } },
        ],
        as: "drugs",
      },
    },
    { $unwind: { path: "$drugs", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: "users",
        let: { creatorId: "$drugs.createdBy" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$creatorId"] } } },
          { $project: { name: 1, profileImage: 1 } },
        ],
        as: "inventory",
      },
    },
    { $unwind: "$inventory" },
  ];

  const filters = createFilterStages(req.query);
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }

  const sortStage = createSortStage(req.query);
  pipeline.push({ $sort: sortStage });

  const projectStage = createProjectStage(req.query);
  pipeline.push({ $project: projectStage });

  const { totalCount, drugs } = await executeAggregationPipeline(
    pipeline,
    skip,
    limit
  );

  const paginationResult = {
    currentPage: page,
    limit,
    numberOfPages: Math.ceil(totalCount / limit),
  };

  if (skip + limit < totalCount) paginationResult.next = page + 1;
  if (skip > 0) paginationResult.prev = page - 1;

  const responseData = {
    status: "success",
    paginationResult,
    results: drugs.length,
    data: drugs,
  };

  res.status(200).json(responseData);
});

/**
 * @desc    Get specific drug by ID - Performance optimized
 * @route   GET /api/v1/drugs/:id
 * @access  Public
 */
const getSpecificDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const drug = await DrugModel.findById(id)
    .populate({
      path: "createdBy",
      select: "name shippingPrice profileImage",
      options: { lean: true },
    })
    .lean();

  if (!drug) {
    return next(new ApiError(`No drug found with ID ${id}`, 404));
  }

  const responseData = { message: "success", data: drug };

  res.status(200).json(responseData);
});

/**
 * @desc    Add new drug - Performance optimized
 * @route   POST /api/v1/drugs
 * @access  Private (Authenticated users only)
 */
const addDrug = asyncHandler(async (req, res, next) => {
  const drugData = {
    ...req.body,
    createdBy: req.user._id,
  };
  const drug = await DrugModel.create(drugData);

  const [populatedDrug, _] = await Promise.all([
    DrugModel.findById(drug._id).populate({
      path: "createdBy",
      select: "name location shippingPrice profileImage",
    }),
    UserModel.findByIdAndUpdate(req.user._id, {
      $push: { drugs: drug._id },
    }),
  ]);

  res.status(201).json({
    status: "success",
    message: "Drug added successfully to your inventory",
    data: populatedDrug,
  });
});

/**
 * @desc    Update specific drug by ID - Performance optimized
 * @route   PUT /api/v1/drugs/:id
 * @access  Private (Authenticated users only)
 */
const updateDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const updatedDrug = await DrugModel.findOneAndUpdate(
    { _id: id },
    { ...req.body },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate({
      path: "createdBy",
      select: "name location shippingPrice profileImage",
      options: { lean: true },
    })
    .lean();

  res.status(200).json({ message: "success", data: updatedDrug });
});

/**
 * @desc    Update drug image - Performance optimized
 * @route   PUT /api/v1/drugs/:id/image
 * @access  Private (Authenticated users only)
 */
const updateDrugImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(`Please upload Drug image`, 400));
  }

  const { id } = req.params;

  const updatedDrug = await DrugModel.findOneAndUpdate(
    { _id: id },
    { imageCover: req.file.path },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate({
      path: "createdBy",
      select: "name location shippingPrice profileImage",
      options: { lean: true },
    })
    .lean();

  res.status(200).json({ message: "success", data: updatedDrug });
});

/**
 * @desc    Delete specific drug by ID - Performance optimized
 * @route   DELETE /api/v1/drugs/:id
 * @access  Private (Authenticated users only)
 */
const deleteDrug = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await Promise.all([
    DrugModel.findByIdAndDelete(id),
    UserModel.findByIdAndUpdate(req.user._id, {
      $pull: { drugs: id },
    }),
  ]);

  res.status(200).json({ message: "success" });
});

/**
 * @desc    Add drugs from Excel file - Performance optimized
 * @route   POST /api/v1/drugs/from-excel
 * @access  Private (Inventory only)
 */
const addDrugsFromExcel = asyncHandler(async (req, res, next) => {
  let filePath = req.selectedFilePath;

  if (!filePath && req.file && req.file.path) {
    filePath = req.file.path;
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

  // Read file and process data
  const data = await readExcelFile(filePath);
  const startRow = Number(req.body.startRow) || 0;
  const endRow = Number(req.body.endRow) || 40;

  validateRowRange({ startRow, endRow }, data.length);

  const slicedData = data.slice(startRow, endRow);
  const { validDrugs, invalidDrugs } = formatDrugData(slicedData, req.user._id);

  const MAX_BATCH_SIZE = 500;

  const processBatches = async (items, batchSize = MAX_BATCH_SIZE) => {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return (
      await Promise.all(
        batches.map((batch) => DrugModel.insertMany(batch, { ordered: false }))
      )
    ).flat();
  };

  let drugs = [];

  if (validDrugs.length > 0) {
    drugs = await processBatches(validDrugs);

    await UserModel.findByIdAndUpdate(req.user._id, {
      $push: {
        drugs: {
          $each: drugs.map((drug) => drug._id),
        },
      },
    });
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

/**
 * @desc    Get all drugs for specific inventory - Performance optimized
 * @route   GET /api/v1/drugs/inventory/:id?
 * @access  Private/Public (Based on parameters)
 */
const getAllDrugsForSpecificInventory = asyncHandler(async (req, res, next) => {
  const id = req.params.id || req.user._id;

  const baseQuery = { createdBy: id };

  const features = new ApiFeatures(DrugModel.find(baseQuery).lean(), req.query)
    .filter()
    .sort()
    .limitFields()
    .search(["name", "manufacturer", "description", "originType"]);

  await features.paginate();

  const [drugs, user] = await Promise.all([
    features.mongooseQuery,
    UserModel.findById(id),
  ]);

  const paginationResult = features.getPaginationResult();

  const responseData = {
    status: "success",
    pagination: paginationResult,
    results: drugs.length,
    data: {
      user: {
        id: user._id,
        name: user.name,
        profileImage: user.profileImage,
        phone: user.phone,
        email: user.email,
        city: user.city,
        governorate: user.governorate,
        location: user.location,
      },
      drugs: drugs,
    },
  };

  res.status(200).json(responseData);
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
  addDrug,
  getAllDrugs,
  addDrugsFromExcel,
  getSpecificDrug,
  updateDrug,
  updateDrugImage,
  deleteDrug,
  getAllDrugsForSpecificInventory,
  getAlternativeDrugsFromAI,
};
