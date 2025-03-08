import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { addDrugToCart, removeDrugFromCart } from "../controllers/cart.controller.js";

const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes, addDrugToCart);
cartRouter.route("/:inventoryId/:drugId")
    .delete(protectedRoutes, removeDrugFromCart);

export default cartRouter;
