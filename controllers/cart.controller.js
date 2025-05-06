/* eslint-disable no-plusplus */
import asyncHandler from "express-async-handler";
import CartModel from "../models/Cart.model.js";
import ApiError from "../utils/apiError.js";
import DrugModel from "../models/Drug.model.js";

/**
 * @desc    Add a drug to the pharmacy's cart
 * @route   POST /api/v1/cart
 * @access  Private/Pharmacy
 */
// ✅ تعديل دالة إضافة الدواء للكارت مع دعم البروموشن (Buy X Get Y Free)

const addDrugToCart = asyncHandler(async (req, res) => {
  const { drugId, quantity } = req.body;
  const drug = await DrugModel.findById(drugId);
  const inventoryId = drug.createdBy._id;

  const unitPrice = drug.discountedPrice || drug.price;
  let freeItems = 0;

  if (
    drug.promotion?.isActive &&
    drug.promotion?.buyQuantity > 0 &&
    drug.promotion?.freeQuantity > 0
  ) {
    const { buyQuantity, freeQuantity } = drug.promotion;
    const fullOffers = Math.floor(quantity / buyQuantity);
    freeItems = fullOffers * freeQuantity;
  }

  const totalDelivered = quantity + freeItems;
  const paidQuantity = quantity;
  const totalDrugPrice = unitPrice * paidQuantity;

  let cart = await CartModel.findOne({ pharmacy: req.user._id });

  if (!cart) {
    cart = await CartModel.create({
      pharmacy: req.user._id,
      inventories: [
        {
          inventory: inventoryId,
          drugs: [
            {
              drug: drugId,
              quantity: totalDelivered,
              paidQuantity,
              Price: unitPrice,
              freeItems,
              totalDelivered,
              totalDrugPrice,
            },
          ],
        },
      ],
    });
  } else {
    const inventoryIndex = cart.inventories.findIndex((item) =>
      item.inventory.equals(inventoryId)
    );

    if (inventoryIndex > -1) {
      const drugIndex = cart.inventories[inventoryIndex].drugs.findIndex((d) =>
        d.drug.equals(drugId)
      );

      if (drugIndex > -1) {
        // إجمالي الطلب الجديد
        const oldQuantity = cart.inventories[inventoryIndex].drugs[drugIndex].paidQuantity;
        const newPaidQuantity = oldQuantity + quantity;

        let newFreeItems = 0;
        if (
          drug.promotion?.isActive &&
          drug.promotion?.buyQuantity > 0 &&
          drug.promotion?.freeQuantity > 0
        ) {
          const { buyQuantity, freeQuantity } = drug.promotion;
          const fullOffers = Math.floor(newPaidQuantity / buyQuantity);
          newFreeItems = fullOffers * freeQuantity;
        }

        const newTotalDelivered = newPaidQuantity + newFreeItems;
        const newTotalDrugPrice = unitPrice * newPaidQuantity;

        const drugEntry = cart.inventories[inventoryIndex].drugs[drugIndex];
        drugEntry.quantity = newTotalDelivered;
        drugEntry.paidQuantity = newPaidQuantity;
        drugEntry.freeItems = newFreeItems;
        drugEntry.totalDelivered = newTotalDelivered;
        drugEntry.totalDrugPrice = newTotalDrugPrice;
        drugEntry.Price = unitPrice;
      } else {
        cart.inventories[inventoryIndex].drugs.push({
          drug: drugId,
          quantity: totalDelivered,
          paidQuantity,
          Price: unitPrice,
          freeItems,
          totalDelivered,
          totalDrugPrice,
        });
      }
    } else {
      cart.inventories.push({
        inventory: inventoryId,
        drugs: [
          {
            drug: drugId,
            quantity: totalDelivered,
            paidQuantity,
            Price: unitPrice,
            freeItems,
            totalDelivered,
            totalDrugPrice,
          },
        ],
      });
    }

    await cart.save();
  }

  cart = await cart.populate([
    {
      path: "inventories.inventory",
      select: "name shippingPrice",
    },
    {
      path: "inventories.drugs.drug",
      select: "name quantity",
    },
  ]);

  res.status(200).json({
    status: "success",
    message: "Drug added to cart successfully",
    numOfCartItems: cart.inventories.reduce(
      (acc, inventory) => acc + inventory.drugs.length,
      0
    ),
    data: cart,
  });
});












/**
 * @desc    Remove a specific drug from cart
 * @route   DELETE /api/v1/cart/:drugId
 * @access  Private/Pharmacy
 */
const removeDrugFromCart = asyncHandler(async (req, res) => {
  const { drugId } = req.params;
  const { cart } = req; // Validated and added by validator

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
    numOfCartItems: cart.inventories.reduce(
      (acc, inventory) => acc + inventory.drugs.length,
      0
    ),
    data: cart,
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
  const { cart, drug } = req; // Validated and added by validator

  // Find and update drug quantity
  const cartInventory = cart.inventories.find((inventory) =>
    inventory.drugs.some((d) => d.drug.toString() === drugId)
  );

  cartInventory.drugs = cartInventory.drugs.map((d) => {
    if (d.drug.toString() === drugId) {
      d.quantity = quantity;
      d.Price = drug.discountedPrice || drug.price;
    }
    return d;
  });

  await cart.save();

  res.status(200).json({
    status: "success",
    message: "Cart updated successfully",
    data: cart,
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
      select: "name quantity",
    },
  ]);

  if (!cart) {
    return next(new ApiError("No cart found for this user", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Cart retrieved successfully",
    numOfCartItems: cart.inventories.reduce(
      (acc, inventory) => acc + inventory.drugs.length,
      0
    ),
    data: cart,
  });
});

/**
 * @desc    Remove inventory from cart
 * @route   DELETE /api/v1/cart/inventory/:inventoryId
 * @access  Private/Pharmacy
 */
const removeInventoryFromCart = asyncHandler(async (req, res) => {
  const { cart } = req; // Validated and added by validator
  const { inventoryId } = req.params;

  cart.inventories = cart.inventories.filter(
    (inventory) => !inventory.inventory.equals(inventoryId)
  );

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
    message: "Inventory removed from cart successfully",
    numOfCartItems: cart.inventories.reduce(
      (acc, inventory) => acc + inventory.drugs.length,
      0
    ),
    data: cart,
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
    message: "Cart cleared successfully",
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
