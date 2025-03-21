import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import DrugModel from "../../models/Drug.model.js";
import CartModel from "../../models/Cart.model.js";

// Validator to check drug availability and get drug details
const checkDrugAvailability = async (drugId, quantity, req) => {
  // Get drug with necessary details
  const drug = await DrugModel.findById(drugId)
    .populate("createdBy")
    .select("price discountedPrice stock createdBy status");

  if (!drug) {
    throw new Error("Drug not found");
  }

  // Check stock
  if (!drug.stock || drug.stock === 0) {
    throw new Error("Drug is out of stock");
  }

  if (drug.stock < quantity) {
    throw new Error(`Only ${drug.stock} items available from this drug`);
  }

  // Check if pharmacy is trying to add their own drug
  if (req.user._id.equals(drug.createdBy._id)) {
    throw new Error("Cannot add your own drugs to cart");
  }

  return drug;
};

// Check total quantity in cart for a specific drug
const checkCartQuantity = async (
  drugId,
  newQuantity,
  pharmacyId,
  drugStock
) => {
  const existingCart = await CartModel.findOne({
    pharmacy: pharmacyId,
    "inventories.drugs.drug": drugId,
  });

  if (existingCart) {
    const currentQuantity = existingCart.inventories.reduce(
      (total, inventory) => {
        const drugItem = inventory.drugs.find(
          (d) => d.drug.toString() === drugId
        );
        return total + (drugItem ? drugItem.quantity : 0);
      },
      0
    );

    const totalQuantity = currentQuantity + newQuantity;

    if (totalQuantity > drugStock) {
      throw new Error(
        `Cannot add ${newQuantity} units. You already have ${currentQuantity} units in cart. Maximum available: ${drugStock}`
      );
    }

    return { existingCart, currentQuantity };
  }

  return { existingCart: null, currentQuantity: 0 };
};

export const addToCartValidator = [
  check("drugId")
    .notEmpty()
    .withMessage("Drug ID is required")
    .isMongoId()
    .withMessage("Invalid drug ID format")
    .custom(async (drugId, { req }) => {
      const quantity = req.body.quantity || 0;

      // Check drug availability and get details
      const drug = await checkDrugAvailability(drugId, quantity, req);

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
      const drug = await checkDrugAvailability(drugId, quantity, req);

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
