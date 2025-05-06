import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import CartModel from "../../models/Cart.model.js";
import {
  validateDrugAvailability,
  checkCartQuantity,
} from "../../services/cartService.js";

export const addToCartValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      const quantity = req.body.quantity || 0;

      // Check drug availability and get details
      const drug = await validateDrugAvailability(
        drugId,
        quantity,
        req.user._id
      );

      // Check cart quantity
      await checkCartQuantity(drugId, quantity, req.user._id, drug.stock);

      // Add drug to request object
      req.drug = drug;
      return true;
    }),

  check("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive number"),

  validatorMiddleware,
];

export const updateCartQuantityValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      const quantity = req.body.quantity || 0;

      // Check drug availability and get details
      const drug = await validateDrugAvailability(
        drugId,
        quantity,
        req.user._id
      );

      // Check if drug exists in cart
      const cart = await CartModel.findOne({
        pharmacy: req.user._id,
        "inventories.drugs.drug": drugId,
      });

      if (!cart) {
        throw new Error("Drug not found in your cart");
      }

      // Store both drug and cart in request
      req.drug = drug;
      req.cart = cart;
      return true;
    }),

  check("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive number"),

  validatorMiddleware,
];

export const removeDrugValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      // Check if drug exists in cart
      const cart = await CartModel.findOne({
        pharmacy: req.user._id,
        "inventories.drugs.drug": drugId,
      });

      if (!cart) {
        throw new Error("Drug not found in your cart");
      }

      req.cart = cart;
      return true;
    }),

  validatorMiddleware,
];

export const removeInventoryValidator = [
  check("inventoryId")
    .notEmpty()
    .withMessage("Inventory ID is required")
    .isMongoId()
    .withMessage("Invalid inventory ID format")
    .custom(async (inventoryId, { req }) => {
      // Check if cart exists and has the inventory
      const cart = await CartModel.findOne({
        pharmacy: req.user._id,
        "inventories.inventory": inventoryId,
      });

      if (!cart) {
        throw new Error("Inventory not found in your cart");
      }

      req.cart = cart;
      return true;
    }),

  validatorMiddleware,
];
