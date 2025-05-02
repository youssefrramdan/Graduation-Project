import asyncHandler from "express-async-handler";
import ApiError from "../utils/apiError.js";
import CategoryModel from "../models/Category.model.js";
import DrugModel from "../models/Drug.model.js";
import UserModel from "../models/User.model.js";

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
  const category = await CategoryModel.find({ _id: id });
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
    return next(new ApiError("Category Not Found", 404));
  }

  const drugsToDelete = await DrugModel.find({ category: id })
    .select("_id")
    .lean();
  const drugIds = drugsToDelete.map((drug) => drug._id);
  await DrugModel.deleteMany({ category: id });
  if (drugIds.length > 0) {
    await UserModel.updateMany(
      { drugs: { $in: drugIds } },
      { $pull: { drugs: { $in: drugIds } } }
    );
  }

  res.status(200).json({
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
