import express from "express";
import {
  addDrug,
  addDrugsFromExcel,
  addDrugWithPromotion,
  createFilterObject,
  deleteDrug,
  getAllDrugs,
  getAllDrugsForSpecificInventory,
  getAlternativeDrugsFromAI,
  getSpecificDrug,
  updateDrug,
  updateDrugImage,
  updatePromotion,
} from "../controllers/drug.controller.js";
import { allowTo, protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugsFromExcelValidator,
  addDrugValidator,
  deleteDrugValidator,
  getSpecificDrugValidator,
  updateDrugValidator,
} from "../utils/validators/drugsValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const drugRouter = express.Router({ mergeParams: true });
const upload = createUploader("excel-files", ["xlsx", "csv"]);
const uploadimg = createUploader("drugs", ["jpeg", "jpg", "png"]);

drugRouter
  .route("/excel")
  .post(
    protectedRoutes,
    allowTo("inventory"),
    upload.single("file"),
    addDrugsFromExcelValidator,
    addDrugsFromExcel
  );

drugRouter
  .route("/")
  .post(protectedRoutes, addDrugValidator, allowTo("inventory"), addDrug)
  .get(protectedRoutes, createFilterObject, getAllDrugs);

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
  .delete(
    protectedRoutes,
    deleteDrugValidator,
    allowTo("inventory"),
    deleteDrug
  );

drugRouter
  .route("/image/:id")
  .put(
    protectedRoutes,
    uploadimg.single("imageCover"),
    allowTo("inventory"),
    updateDrugImage
  );

drugRouter.patch(
  "/:id/promotion",
  protectedRoutes,
  allowTo("inventory"),
  updatePromotion
);

drugRouter.post(
  "/promotion",
  protectedRoutes,
  allowTo("inventory"),
  addDrugWithPromotion
);

export default drugRouter;
