import  { Router } from "express";
import { addCategory, getCategories } from "../controllers/category.controller.js";

const categoryRouter = Router();
categoryRouter.get("/", getCategories)
categoryRouter.route("/").get(addCategory).post(addCategory);

export default categoryRouter;
