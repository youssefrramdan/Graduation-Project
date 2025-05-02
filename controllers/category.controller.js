import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import CategoryModel from "../models/Category.model.js";

const createCategory = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.imageCover = req.file.path;
  }
  const category = await CategoryModel.create(req.body);
  res.status(201).json({
    message: "success",
    data: category,
  });
});

const getAllCategories = asyncHandler(async (req, res, next) => {
  const categories = await CategoryModel.find({});
  res.status(200).json({
    message: "success",
    data: categories,
  });
});

const getSpecificCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await CategoryModel.find(id);
  if (!category) {
    next(new ApiError("Category Not Found", 500));
  }
  res.status(200).json({
    message: "success",
    data: category,
  });
});

const updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await CategoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  res.status(200).json({
    message: "success",
    data: category,
  });
});

const deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await CategoryModel.findByIdAndDelete(id);
  if (!category) {
    next(new ApiError("Category Not Found", 500));
  }
  res.status(201).json({
    message: "success",
  });
});
export {
  createCategory,
  getAllCategories,
  getSpecificCategory,
  updateCategory,
  deleteCategory,
};
