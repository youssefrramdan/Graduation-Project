/* eslint-disable no-plusplus */
import asyncHandler from "express-async-handler";
import DrugModel from "../models/Drug.model.js";
import CartModel from "../models/Cart.model.js";
import ApiError from "../utils/apiError.js";

/**
 * Function to calculate the total cart price and total price after discount
 */

const calcTotalCartPrice = (cart) => {
  let totalCartPrice = 0;
  let totalPriceAfterDiscount = 0;

  // Iterate over each inventory in the cart
  cart.items.forEach((inventoryItem) => {
    let inventoryPrice = 0;
    let inventoryPriceAfterDiscount = 0;

    inventoryItem.drugs.forEach((drug) => {
      // Calculate total price for the drug
      const drugTotal = (drug.price || 0) * (drug.quantity || 0);
      inventoryPrice += drugTotal;
      totalCartPrice += drugTotal;
      // Use the discounted price from the Drug model directly
      const drugTotalAfterDiscount =
        (drug.discountedPrice || 0) * (drug.quantity || 0);
      inventoryPriceAfterDiscount += drugTotalAfterDiscount;
      totalPriceAfterDiscount += drugTotalAfterDiscount;
    });

    inventoryItem.totalInventoryPrice = inventoryPrice;
    inventoryItem.totalInventoryPriceAfterDiscount =
      inventoryPriceAfterDiscount;
  });

  // Update cart prices
  cart.totalCartPrice = totalCartPrice;
  cart.totalPriceAfterDiscount = totalPriceAfterDiscount || 0;
};

/**
 * @desc    Add a drug to the pharmacy's cart
 * @route   POST /api/v1/cart
 * @access  Private/Pharmacy
 */
const addDrugToCart = asyncHandler(async (req, res, next) => {
  const { drugId, quantity } = req.body;
  const pharmacyId = req.user._id;
  const { drug } = req; // Drug is already validated and added by validator
  const inventoryId = drug.createdBy._id;

  // Check if the pharmacy already has a cart
  let cart = await CartModel.findOne({ pharmacy: pharmacyId });

  if (!cart) {
    // Create a new cart if not found and add the first drug
    cart = await CartModel.create({
      pharmacy: pharmacyId,
      items: [
        {
          inventory: inventoryId,
          drugs: [
            {
              drug: drugId,
              quantity,
              price: drug.price,
              discountedPrice: drug.discountedPrice,
            },
          ],
        },
      ],
      totalCartPrice: 0,
      totalPriceAfterDiscount: 0,
    });
  } else {
    // Check if the inventory already exists in the cart
    const inventoryIndex = cart.items.findIndex((item) =>
      item.inventory.equals(inventoryId)
    );

    if (inventoryIndex > -1) {
      // If inventory exists, check if the drug already exists
      const drugIndex = cart.items[inventoryIndex].drugs.findIndex((d) =>
        d.drug.equals(drugId)
      );

      if (drugIndex > -1) {
        // If the drug exists, update the quantity
        cart.items[inventoryIndex].drugs[drugIndex].quantity += quantity;
        cart.items[inventoryIndex].drugs[drugIndex].price = drug.price;
        cart.items[inventoryIndex].drugs[drugIndex].discountedPrice =
          drug.discountedPrice;
      } else {
        // If the drug does not exist, add it
        cart.items[inventoryIndex].drugs.push({
          drug: drugId,
          quantity,
          price: drug.price,
          discountedPrice: drug.discountedPrice,
        });
      }
    } else {
      // If the inventory does not exist, add it with the new drug
      cart.items.push({
        inventory: inventoryId,
        drugs: [
          {
            drug: drugId,
            quantity,
            price: drug.price,
            discountedPrice: drug.discountedPrice,
          },
        ],
      });
    }
  }

  // Calculate and update total cart price
  calcTotalCartPrice(cart);
  await cart.save();

  return res.status(200).json({
    status: "success",
    message: "Drug added to cart successfully",
    numOfCartItems: cart.items.reduce(
      (acc, item) => acc + item.drugs.length,
      0
    ),
    data: cart,
  });
});

/**
 * @desc    Remove a specific drug from a specific inventory in the cart
 * @route   DELETE /api/v1/cart/:drugId
 * @access  Private/Pharmacy
 */
const removeDrugFromCart = asyncHandler(async (req, res, next) => {
  const { drugId } = req.params;
  const pharmacyId = req.user._id;

  const cart = await CartModel.findOne({ pharmacy: pharmacyId });

  if (!cart) {
    return next(new ApiError("Cart not found.", 404));
  }

  cart.items = cart.items.filter((item) => {
    // Remove the specific drug
    item.drugs = item.drugs.filter((d) => d.drug.toString() !== drugId);
    // Keep the inventory only if it still has drugs
    return item.drugs.length > 0;
  });

  if (cart.items.length === 0) {
    await CartModel.findOneAndDelete({ pharmacy: pharmacyId });
    return res.status(200).json({
      status: "success",
      message: "Cart emptied and deleted.",
    });
  }

  calcTotalCartPrice(cart);
  await cart.save();

  return res.status(200).json({
    status: "success",
    numOfCartItems: cart.items.reduce(
      (acc, item) => acc + item.drugs.length,
      0
    ),
    data: cart,
  });
});

/**
 * @desc    Clear Logged User Shopping Cart
 * @route   DELETE /api/v1/cart
 * @access  Private/Pharmacy
 */
const clearUserCart = asyncHandler(async (req, res, next) => {
  const pharmacyId = req.user._id;
  const cart = await CartModel.findOne({ pharmacy: pharmacyId });
  if (!cart) {
    return next(new ApiError("No cart found for this user.", 404));
  }

  await CartModel.findOneAndDelete({ pharmacy: pharmacyId });

  res.status(200).json({ status: "success" });
});

/**
 * @desc    Update Cart Item Quantity
 * @route   PUT /api/v1/cart
 * @access  Private/Pharmacy
 */
const updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { drugId } = req.params;
  const { quantity } = req.body;
  const { cart, drug } = req; // Already validated and available from validator

  // Find the drug in the cart and update its quantity
  const cartItem = cart.items.find((item) =>
    item.drugs.some((d) => d.drug.toString() === drugId)
  );

  cartItem.drugs = cartItem.drugs.map((d) => {
    if (d.drug.toString() === drugId) {
      d.quantity = quantity;
      d.price = drug.price;
      d.discountedPrice = drug.discountedPrice;
    }
    return d;
  });

  calcTotalCartPrice(cart);
  await cart.save();

  res.status(200).json({
    status: "success",
    data: cart,
  });
});

/**
 * @desc    get logged pharmacy's cart
 * @route   POST /api/v1/cart
 * @access  Private/Pharmacy
 */

const getLoggedUserCart = asyncHandler(async (req, res, next) => {
  const cart = await CartModel.findOne({ pharmacy: req.user._id });

  if (!cart) {
    return next(
      new ApiError(`There is no cart for this user id: ${req.user._id}`, 404)
    );
  }

  calcTotalCartPrice(cart);

  res.status(200).json({
    status: "success",
    message: "Cart retrieved successfully",
    numOfCartItems: cart.items.reduce(
      (acc, item) => acc + item.drugs.length,
      0
    ),
    data: cart,
  });
});

/**
 * @desc    remove inventory from cart
 * @route   POST /api/v1/cart/:inventoryId
 * @access  Private/Pharmacy
 */

const removeInventoryFromCart = asyncHandler(async (req, res, next) => {
  const { inventoryId } = req.params;
// Cart is already validated and available from validator

  // Remove the inventory from cart
  const updatedCart = await CartModel.findOneAndUpdate(
    { pharmacy: req.user._id },
    { $pull: { items: { inventory: inventoryId } } },
    { new: true }
  );

  calcTotalCartPrice(updatedCart);

  res.status(200).json({
    status: "success",
    message: "Inventory removed from cart successfully",
    numOfCartItems: updatedCart.items.reduce(
      (acc, item) => acc + item.drugs.length,
      0
    ),
    data: updatedCart,
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
