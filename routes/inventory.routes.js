import express from "express";
import {
  getAllInventories,
  getSpecificInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} from "../controllers/inventory.controller.js";
import {
  createInventoryValidator,
  deleteInventoryValidator,
  getSpecificInventoryValidator,
  updateInventoryValidator,
} from "../utils/validators/inventoryValidator.js";
import createUploader from "../middlewares/uploadImageMiddleware.js";

const inventoryRouter = express.Router();
const upload = createUploader("inventories", ["jpeg", "jpg", "png", "pdf"]);
inventoryRouter
  .route("/")
  .get(getAllInventories)
  .post(
    upload.single("licenseDocument"),
    createInventoryValidator,
    createInventory
  );

inventoryRouter
  .route("/:id")
  .get(getSpecificInventoryValidator, getSpecificInventory)
  .put(updateInventoryValidator, updateInventory)
  .delete(deleteInventoryValidator, deleteInventory);

export default inventoryRouter;
