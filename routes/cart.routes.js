import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { addDrugToCart, clearUserCart, removeDrugFromCart, updateCartItemQuantity } from "../controllers/cart.controller.js";

const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes, addDrugToCart);
cartRouter.route("/:inventoryId/:drugId").delete(protectedRoutes, removeDrugFromCart);
cartRouter.route("/").delete(protectedRoutes, clearUserCart);
cartRouter.route("/:inventoryId/:drugId").put(protectedRoutes, updateCartItemQuantity);

export default cartRouter;
