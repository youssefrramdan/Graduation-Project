/* eslint-disable no-plusplus */
import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import ApiError from "../utils/apiError.js";
import {
  addOrUpdateDrugInCart,
  validateDrugAvailability,
  checkCartQuantity,
  transformCart,
  calculatePromotionalItems,
  calculateDrugPriceDetails,
} from "../services/cartService.js";

/**
 * @desc    Add a drug to the pharmacy's cart
 * @route   POST /api/v1/cart
 * @access  Private/Pharmacy
 */
const addDrugToCart = asyncHandler(async (req, res) => {
  const { drugId, quantity } = req.body;

  // Validate drug availability and get drug details
  const drug = await validateDrugAvailability(drugId, quantity, req.user._id);

  // Check cart quantity
  await checkCartQuantity(drugId, quantity, req.user._id, drug.stock);

  let cart = await CartModel.findOne({ pharmacy: req.user._id });

  if (!cart) {
    cart = await CartModel.create({
      pharmacy: req.user._id,
      inventories: [],
    });
  }

  // Add or update drug in cart
  cart = await addOrUpdateDrugInCart(cart, drug, drug.createdBy._id, quantity);
  await cart.save();

  // Populate cart data
  cart = await cart.populate([
    {
      path: "inventories.inventory",
      select: "name shippingPrice",
    },
    {
      path: "inventories.drugs.drug",
      select: "name quantity promotion",
    },
  ]);

  res.status(200).json({
    status: "success",
    message: "Drug added to cart successfully",
    data: transformCart(cart),
  });
});

/**
 * @desc    Remove a specific drug from cart
 * @route   DELETE /api/v1/cart/:drugId
 * @access  Private/Pharmacy
 */
const removeDrugFromCart = asyncHandler(async (req, res) => {
  const { drugId } = req.params;
  const { cart } = req;

  // Remove drug and filter out empty inventories
  cart.inventories = cart.inventories.filter((inventory) => {
    inventory.drugs = inventory.drugs.filter(
      (d) => d.drug.toString() !== drugId
    );
    return inventory.drugs.length > 0;
  });

  if (cart.inventories.length === 0) {
    await CartModel.findOneAndDelete({ pharmacy: req.user._id });
    return res.status(200).json({
      status: "success",
      message: "Cart emptied and deleted",
    });
  }

  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Drug removed from cart successfully",
    data: transformCart(cart),
  });
});

/**
 * @desc    Update Cart Item Quantity
 * @route   PUT /api/v1/cart/:drugId
 * @access  Private/Pharmacy
 */
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const { drugId } = req.params;
  const { quantity } = req.body;
  const { drug } = req;
  let { cart } = req;

  // Find and update drug quantity
  const cartInventory = cart.inventories.find((inventory) =>
    inventory.drugs.some((d) => d.drug.toString() === drugId)
  );

  cartInventory.drugs = cartInventory.drugs.map((d) => {
    if (d.drug.toString() === drugId) {
      const { freeItems, paidQuantity, totalDelivered } =
        calculatePromotionalItems(drug, quantity);
      const { unitPrice, totalDrugPrice } = calculateDrugPriceDetails(
        drug,
        paidQuantity
      );

      d.quantity = totalDelivered;
      d.paidQuantity = paidQuantity;
      d.freeItems = freeItems;
      d.totalDelivered = totalDelivered;
      d.totalDrugPrice = totalDrugPrice;
      d.Price = unitPrice;
    }
    return d;
  });

  await cart.save();

  // Populate cart data before sending response
  cart = await cart.populate([
    {
      path: "inventories.inventory",
      select: "name shippingPrice",
    },
    {
      path: "inventories.drugs.drug",
      select: "name quantity promotion",
    },
  ]);

  res.status(200).json({
    status: "success",
    message: "Cart updated successfully",
    data: transformCart(cart),
  });
});

/**
 * @desc    Get logged pharmacy's cart
 * @route   GET /api/v1/cart
 * @access  Private/Pharmacy
 */
const getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await CartModel.findOne({ pharmacy: req.user._id }).populate([
    {
      path: "inventories.inventory",
      select: "name shippingPrice",
    },
    {
      path: "inventories.drugs.drug",
      select: "name quantity promotion",
    },
  ]);

  if (!cart) {
    return next(new ApiError("No cart found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Cart retrieved successfully",
    data: transformCart(cart),
  });
});

/**
 * @desc    Remove inventory from cart
 * @route   DELETE /api/v1/cart/inventory/:inventoryId
 * @access  Private/Pharmacy
 */
const removeInventoryFromCart = asyncHandler(async (req, res) => {
  const { cart } = req;
  const { inventoryId } = req.params;

  cart.inventories = cart.inventories.filter(
    (inventory) => !inventory.inventory.equals(inventoryId)
  );

  if (cart.inventories.length === 0) {
    await CartModel.findOneAndDelete({ pharmacy: req.user._id });
    return res.status(200).json({
      status: "success",
      data: {
        pharmacy: req.user._id,
        inventories: [],
        totalQuantity: 0,
        totalPrice: 0,
      },
    });
  }

  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Inventory removed from cart successfully",
    data: transformCart(cart),
  });
});

/**
 * @desc    Clear User Cart
 * @route   DELETE /api/v1/cart
 * @access  Private/Pharmacy
 */
const clearUserCart = asyncHandler(async (req, res) => {
  await CartModel.findOneAndDelete({ pharmacy: req.user._id });

  res.status(200).json({
    status: "success",
    data: {
      _id: null,
      pharmacy: req.user._id,
      inventories: [],
      totalQuantity: 0,
      totalPrice: 0,
    },
  });
});

export {
  addDrugToCart,
  getLoggedUserCart,
  removeInventoryFromCart,
  removeDrugFromCart,
  clearUserCart,
  updateCartItemQuantity,
};
