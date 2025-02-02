/* eslint-disable import/no-extraneous-dependencies */
import asyncHandler from "express-async-handler";
import PharmacyModel from "../models/Pharmacy.model.js";
import ApiError from "../utils/apiError.js";

// @desc     Get all pharmacies
// @route    GET /api/v1/pharmacies
// @access   Private
const getAllPharmacies = asyncHandler(async (req, res) => {
  const countDocuments = await PharmacyModel.countDocuments();
  //----------------------------------------------------
  // pagination Result
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 5;
  const skip = (page - 1) * limit;
  const endIndex = page * limit;
  const pagination = {};
  pagination.currentPage = page;
  pagination.resultsPerPage = limit;
  pagination.totalPages = Math.ceil(countDocuments / limit); //
  if (endIndex < countDocuments) {
    pagination.nextPage = page + 1;
  }
  if (page > 0) {
    pagination.previousPage = page - 1;
  }
  // ---------------------------------------------
  let mongooseQuery = PharmacyModel.find().skip(skip).limit(limit);

  if (req.query.keyword) {
    const searchQuery = {
      $or: [
        { pharmacyName: { $regex: req.query.keyword, $options: "i" } },
        { ownerName: { $regex: req.query.keyword, $options: "i" } },
      ],
    };
    mongooseQuery = PharmacyModel.find(searchQuery).skip(skip).limit(limit);
  }

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    mongooseQuery = mongooseQuery.sort(sortBy);
  } else {
    mongooseQuery = mongooseQuery.sort("-createdAt");
  }

  if (req.query.fields) {
    const fields = req.query.fields.split(",").join(" ");
    mongooseQuery = mongooseQuery.select(fields);
  } else {
    mongooseQuery = mongooseQuery.select("-__v");
  }

  const pharmacies = await mongooseQuery;

  res.status(200).json({
    message: "success",
    pagination,
    result: pharmacies.length,
    data: pharmacies,
  });
});

// @desc     Get specific pharmacy by id
// @route    GET /api/v1/pharmacies/:id
// @access   Private
const getSpecificPharmacy = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const pharmacy = await PharmacyModel.findById(id);
  if (!pharmacy) {
    return next(new ApiError(`No pharmacy found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: pharmacy });
});

// @desc     Create a new pharmacy
// @route    POST /api/v1/pharmacies
// @access   Private
const createPharmacy = asyncHandler(async (req, res) => {
  console.log("Received Files:", req.files);

  if (req.files.imageOfPharmacy) {
    req.body.imageOfPharmacy = req.files.imageOfPharmacy[0].path;
  }
  if (req.files.licenseDocument) {
    req.body.licenseDocument = req.files.licenseDocument[0].path;
  }

  const pharmacy = await PharmacyModel.create(req.body);
  res.status(201).json({ message: "success", data: pharmacy });
});

// @desc     Update an existing pharmacy
// @route    PUT /api/v1/pharmacies/:id
// @access   Private
const updatePharmacy = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const pharmacy = await PharmacyModel.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!pharmacy) {
    return next(new ApiError(`No pharmacy found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: pharmacy });
});

// @desc     Delete an existing pharmacy
// @route    DELETE /api/v1/pharmacies/:id
// @access   Private
const deletePharmacy = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const pharmacy = await PharmacyModel.findByIdAndDelete(id);
  if (!pharmacy) {
    return next(new ApiError(`No pharmacy found with ID: ${id}`, 400));
  }
  res.status(200).json({ message: "success", data: pharmacy });
});

export {
  getAllPharmacies,
  getSpecificPharmacy,
  createPharmacy,
  updatePharmacy,
  deletePharmacy,
};
