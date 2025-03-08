import asyncHandler from "express-async-handler";
import DrugModel from "../models/Drug.model.js";
import CartModel from "../models/Cart.model.js";
import ApiError from "../utils/apiError.js";

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

  // Extract pharmacy ID from the authenticated user from product routes
  const pharmacyId = req.user._id;

  // Validate required fields
  if (!drugId || !quantity) {
    return res
      .status(400)
      .json({ message: "Drug ID and quantity are required." });
  }

  // Find the drug and ensure it exists
  const drug = await DrugModel.findById(drugId).populate("createdBy");

  console.log(`Only ${drug.stock} units available in stock`);

  if (!drug) {
    return res.status(404).json({ message: "Drug not found." });
  }

  // Retrieve the inventory (the seller of the drug)
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
 * @route   DELETE /api/v1/cart/:inventoryId/:drugId
 * @access  Private/Pharmacy
 */
const removeDrugFromCart = asyncHandler(async (req, res, next) => {
  const { inventoryId, drugId } = req.params;

  const pharmacyId = req.user._id;

  const cart = await CartModel.findOneAndUpdate(
    {
      pharmacy: pharmacyId,
      "items.inventory": inventoryId,
    },
    {
      $pull: {
        "items.$[item].drugs": { drug: drugId },
      },
    },
    {
      new: true,
      arrayFilters: [{ "item.inventory": inventoryId }],
    }
  );

  if (!cart) {
    return res.status(404).json({ message: "Cart or inventory not found." });
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
  await CartModel.findOneAndDelete({ pharmacy: pharmacyId });

  res.status(200).json({ status: "success" });
});

/**
 * @desc    Update Cart Item Quantity
 * @route   PUT /api/v1/cart
 * @access  Private/Pharmacy
 */
const updateCartItemQuantity = asyncHandler(async (req, res, next) => {
  const { inventoryId, drugId } = req.params;
  const { quantity } = req.body;

  const cart = await CartModel.findOne({ pharmacy: req.user._id });

  if (!cart) {
    return res.status(404).json({ message: "There is no cart for user" });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.inventory.toString() === inventoryId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json({ message: `There is no item for this id: ${inventoryId}` });
  }

  const drugIndex = cart.items[itemIndex].drugs.findIndex(
    (drug) => drug.drug.toString() === drugId
  );

  if (drugIndex === -1) {
    return res
      .status(404)
      .json({ message: `There is no drug for this id: ${drugId}` });
  }

  cart.items[itemIndex].drugs[drugIndex].quantity = quantity;

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
  if (!inventoryId) {
    return next(new ApiError("Inventory ID is required.", 404));
  }

  const cart = await CartModel.findOne({ pharmacy: req.user._id });
  if (!cart) {
    return next(new ApiError("Cart not found for this user.", 404));
  }

  const inventoryExists = cart.items.some(
    (item) => item.inventory.toString() === inventoryId
  );
  if (!inventoryExists) {
    return next(new ApiError("Inventory not found in the cart.", 404));
  }

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

export { addDrugToCart, getLoggedUserCart, removeInventoryFromCart , removeDrugFromCart , clearUserCart , updateCartItemQuantity};
