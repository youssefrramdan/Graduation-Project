import express from "express";
import { protectedRoutes } from "../controllers/auth.controller.js";
import { addDrugToCart, getLoggedUserCart } from "../controllers/cart.controller.js";

const cartRouter = express.Router();

cartRouter.route("/").post(protectedRoutes, addDrugToCart);
cartRouter.route("/").get(protectedRoutes, getLoggedUserCart);

export default cartRouter;
