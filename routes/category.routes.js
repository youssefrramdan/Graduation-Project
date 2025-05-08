import express from "express";
import createUploader from "../middlewares/uploadImageMiddleware.js";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getSpecificCategory,
  updateCategory,
} from "../controllers/category.controller.js";
import { protectedRoutes, allowTo } from "../controllers/auth.controller.js";
import drugRouter from "./drug.routes.js";

const categoryRouter = express.Router();
const upload = createUploader("category-image");
categoryRouter
  .route("/")
  .post(
    protectedRoutes,
    allowTo("admin"),
    upload.single("imageCover"),
    createCategory
  )
  .get(getAllCategories);

categoryRouter.use("/:categoryId/drugs", drugRouter);

categoryRouter
  .route("/:id")
  .get(getSpecificCategory)
  .put(
    protectedRoutes,
    allowTo("admin"),
    upload.single("imageCover"),
    updateCategory
  )
  .delete(protectedRoutes, allowTo("admin"), deleteCategory);

export default categoryRouter;
