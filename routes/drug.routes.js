import express from "express";
import {
  addDrug,
  addDrugsFromExcel,
  deleteDrug,
  getAllDrugs,
  getSpecificDrug,
  updateDrug,
} from "../controllers/drug.controller.js";
import { protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugsFromExcelValidator,
  addDrugValidator,
  deleteDrugValidator,
  getSpecificDrugValidator,
  updateDrugValidator,
} from "../utils/validators/drugsValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const drugRouter = express.Router();
const upload = createUploader("excel-files", ["xlsx"]);

drugRouter
  .route("/excel")
  .post(
    protectedRoutes,
    upload.single("file"),
    addDrugsFromExcelValidator,
    addDrugsFromExcel
  );

drugRouter
  .route("/")
  .post(protectedRoutes, addDrugValidator, addDrug)
  .get(getAllDrugs);

drugRouter
  .route("/:id")
  .get(getSpecificDrugValidator, getSpecificDrug) // Get drug by ID
  .put(protectedRoutes, updateDrugValidator, updateDrug) // Update drug details
  .delete(protectedRoutes, deleteDrugValidator, deleteDrug); // Delete drug

export default drugRouter;
