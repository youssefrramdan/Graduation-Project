import express from "express";
import {
  addDrug,
  addDrugsFromExcel,
  getAllDrugs,
} from "../controllers/drug.controller.js";
import { protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugValidator,
} from "../utils/validators/drugsValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const drugRouter = express.Router();
const upload = createUploader("excel-files", ["xlsx"]);

drugRouter
  .route("/excel")
  .post(protectedRoutes, upload.single("file"), addDrugsFromExcel);

drugRouter
  .route("/")
  .post(protectedRoutes, addDrugValidator, addDrug)
  .get(getAllDrugs);


export default drugRouter;
