import express from "express";
import { allowTo, protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugToCart,
  getLoggedUserCart,
  removeInventoryFromCart,
  removeDrugFromCart,
  clearUserCart,
  updateCartItemQuantity,
} from "../controllers/cart.controller.js";

import {
  addToCartValidator,
  updateCartQuantityValidator,
  removeDrugValidator,
  removeInventoryValidator,
} from "../utils/validators/cartValidation.js";

const cartRouter = express.Router();

// Apply authentication for all routes
cartRouter.use(protectedRoutes);
cartRouter.use(allowTo("pharmacy"));
cartRouter
  .route("/")
  .get(getLoggedUserCart)
  .post(addToCartValidator, addDrugToCart)
  .delete(clearUserCart);

cartRouter
  .route("/drug/:drugId")
  .put(updateCartQuantityValidator, updateCartItemQuantity)
  .delete(removeDrugValidator, removeDrugFromCart);

cartRouter
  .route("/inventory/:inventoryId")
  .delete(removeInventoryValidator, removeInventoryFromCart);

export default cartRouter;
