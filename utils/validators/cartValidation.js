import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import DrugModel from "../../models/Drug.model.js";
import CartModel from "../../models/Cart.model.js";

export const addToCartValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      // 1) Check if drug exists and populate necessary fields
      const drug = await DrugModel.findById(drugId)
        .populate("createdBy")
        .select("price discountedPrice stock createdBy status");

      if (!drug) {
        throw new Error("Drug not found");
      }

      // // 2) Check drug status
      // if (drug.status !== "active") {
      //   throw new Error("This drug is currently not available for purchase");
      // }

      // 3) Check if drug has stock
      if (!drug.stock || drug.stock === 0) {
        throw new Error("Drug is out of stock");
      }

      // 4) Check if inventory is trying to add their own drug
      if (req.user._id.equals(drug.createdBy._id)) {
        throw new Error("Cannot add your own drugs to cart");
      }

      // 5) Check if inventory already has this drug in cart
      const existingCart = await CartModel.findOne({
        pharmacy: req.user._id,
        "items.drugs.drug": drugId,
      });

      if (existingCart) {
        const totalQuantity = existingCart.items.reduce((total, item) => {
          const drug = item.drugs.find((d) => d.drug.toString() === drugId);
          return total + (drug ? drug.quantity : 0);
        }, 0);

        if (totalQuantity >= drug.stock) {
          throw new Error(
            "You already have maximum available quantity in cart"
          );
        }
      }

      // Add drug to request object for later use
      req.drug = drug;
      return true;
    }),

  check("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive number")
    .custom(async (quantity, { req }) => {
      // 1) Check if drug validation happened
      if (!req.drug) {
        throw new Error("Drug validation must happen first");
      }

      // 2) Check if quantity is available in stock
      if (quantity > req.drug.stock) {
        throw new Error(`not available in stock`);
      }

      // 3) Check total quantity with existing cart items
      const existingCart = await CartModel.findOne({
        pharmacy: req.user._id,
        "items.drugs.drug": req.drug._id,
      });

      if (existingCart) {
        const currentQuantity = existingCart.items.reduce((total, item) => {
          const drug = item.drugs.find(
            (d) => d.drug.toString() === req.drug._id.toString()
          );
          return total + (drug ? drug.quantity : 0);
        }, 0);

        if (currentQuantity + quantity > req.drug.stock) {
          throw new Error(
            `Cannot add ${quantity} units. You already have ${currentQuantity} units in cart. Maximum available: ${req.drug.stock}`
          );
        }
      }

      return true;
    }),

  validatorMiddleware,
];

export const updateCartQuantityValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      // 1) Check if drug exists and get its details
      const drug = await DrugModel.findById(drugId).select(
        "price discountedPrice stock status"
      );

      if (!drug) {
        throw new Error("Drug not found");
      }

      // // 2) Check drug status
      // if (drug.status !== "active") {
      //   throw new Error("This drug is currently not available for purchase");
      // }

      // 3) Check if drug has stock
      if (!drug.stock || drug.stock === 0) {
        throw new Error("Drug is out of stock");
      }

      // 4) Check if drug exists in cart
      const cart = await CartModel.findOne({
        pharmacy: req.user._id,
        "items.drugs.drug": drugId,
      });

      if (!cart) {
        throw new Error("Drug not found in your cart");
      }

      // Store both drug and cart in request for later use
      req.drug = drug;
      req.cart = cart;
      return true;
    }),

  check("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive number")
    .custom(async (quantity, { req }) => {
      // 1) Check if drug validation happened
      if (!req.drug) {
        throw new Error("Drug validation must happen first");
      }

      // 2) Check if quantity is available in stock
      if (quantity > req.drug.stock) {
        throw new Error(`Only ${req.drug.stock} units available in stock`);
      }

      return true;
    }),

  validatorMiddleware,
];

export const removeDrugValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      const cart = await CartModel.findOne({
        pharmacy: req.user._id,
        "items.drugs.drug": drugId,
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
      // 1) Check if cart exists for this pharmacy
      const cart = await CartModel.findOne({ pharmacy: req.user._id });
      if (!cart) {
        throw new Error("Cart not found for this user");
      }

      // 2) Check if inventory exists in the cart
      const inventoryExists = cart.items.some(
        (item) => item.inventory.toString() === inventoryId
      );
      if (!inventoryExists) {
        throw new Error("Inventory not found in the cart");
      }

      // Store cart in request for later use
      req.cart = cart;
      return true;
    }),

  validatorMiddleware,
];
