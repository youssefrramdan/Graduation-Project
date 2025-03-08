import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import {
  addDrugToCart,
  clearUserCart,
  removeDrugFromCart,
  updateCartItemQuantity,
  getLoggedUserCart,
  removeInventoryFromCart,
} from "../controllers/cart.controller.js";
import {
  addToCartValidator,
  updateCartQuantityValidator,
  removeDrugValidator,
  removeInventoryValidator,
} from "../utils/validators/cartValidation.js";

const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes,addToCartValidator, addDrugToCart);
cartRouter.route("/").delete(protectedRoutes,clearUserCart).get(protectedRoutes,getLoggedUserCart);
cartRouter
  .route("/:drugId")
  .put(protectedRoutes,updateCartQuantityValidator, updateCartItemQuantity)
  .delete(protectedRoutes,removeDrugValidator, removeDrugFromCart);
cartRouter
  .route("/:inventoryId")
  .delete(protectedRoutes,removeInventoryValidator, removeInventoryFromCart);

export default cartRouter;
