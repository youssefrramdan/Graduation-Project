import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import { createCategory, deleteCategory, updateCategory } from "../controllers/category.controller.js";

const categoryRouter = express.Router();
const upload = createUploader("category-image");

categoryRouter.route("/").post(upload.single("imageCover"), createCategory);

categoryRouter
  .route("/:id")
  .put(upload.single("imageCover"), updateCategory)
  .delete(deleteCategory);

export default categoryRouter;
