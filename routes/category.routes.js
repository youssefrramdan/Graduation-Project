import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getSpecificCategory,
  updateCategory,
} from "../controllers/category.controller.js";

const categoryRouter = express.Router();
const upload = createUploader("category-image");

categoryRouter
  .route("/")
  .post(upload.single("imageCover"), createCategory)
  .get(getAllCategories);

categoryRouter
  .route("/:id")
  .get(getSpecificCategory)
  .put(upload.single("imageCover"), updateCategory)
  .delete(deleteCategory);

export default categoryRouter;
