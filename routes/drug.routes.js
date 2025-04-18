import express from "express";
import {
  addDrug,
  addDrugsFromExcel,
  deleteDrug,
  getAllDrugs,
  getAllDrugsForSpecificInventory,
  getAlternativeDrugsFromAI,
  getSpecificDrug,
  updateDrug,
  updateDrugImage,
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
const upload = createUploader("excel-files", ["xlsx", "csv"]);
const uploadimg = createUploader("drugs", ["jpeg", "jpg", "png"]);

drugRouter
  .route("/excel")
  .post(
    protectedRoutes,
    upload.single("file"),
    addDrugsFromExcelValidator,
    addDrugsFromExcel
  );

// uploadimg.single("imageCover"),
drugRouter
  .route("/")
  .post(protectedRoutes, addDrugValidator, addDrug)
  .get(protectedRoutes, getAllDrugs);

drugRouter.route("/getAlternatives").post(getAlternativeDrugsFromAI);

drugRouter
  .route("/inventory")
  .get(protectedRoutes, getAllDrugsForSpecificInventory);

drugRouter.route("/inventory/:id").get(getAllDrugsForSpecificInventory);

drugRouter
  .route("/:id")
  .get(getSpecificDrugValidator, getSpecificDrug)
  .put(
    protectedRoutes,
    uploadimg.single("imageCover"),
    updateDrugValidator,
    updateDrug
  )
  .delete(protectedRoutes, deleteDrugValidator, deleteDrug);

drugRouter
  .route("/image/:id")
  .put(protectedRoutes, uploadimg.single("imageCover"), updateDrugImage);

export default drugRouter;
