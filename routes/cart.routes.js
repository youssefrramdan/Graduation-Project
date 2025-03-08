import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { addDrugToCart, getLoggedUserCart, removeInventoryFromCart } from "../controllers/cart.controller.js";

const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes, addDrugToCart);
cartRouter.route("/").get(protectedRoutes, getLoggedUserCart);
cartRouter.route("/:inventoryId").delete(protectedRoutes,removeInventoryFromCart);

export default cartRouter;
