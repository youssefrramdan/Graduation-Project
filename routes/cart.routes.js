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
const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes, addDrugToCart);
cartRouter.route("/:inventoryId/:drugId");
cartRouter
  .route("/")
  .delete(protectedRoutes, clearUserCart)
  .get(protectedRoutes, getLoggedUserCart);
cartRouter
  .route("/:inventoryId/:drugId")
  .put(protectedRoutes, updateCartItemQuantity)
  .delete(protectedRoutes, removeDrugFromCart);
cartRouter.route("/");
cartRouter
  .route("/:inventoryId")
  .delete(protectedRoutes, removeInventoryFromCart);

export default cartRouter;
