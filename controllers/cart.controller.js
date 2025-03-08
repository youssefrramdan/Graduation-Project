import DrugModel from "../models/Drug.model.js";
import CartModel from "../models/Cart.model.js";
import expressAsyncHandler from "express-async-handler";

const calcTotalCartPrice = (cart) => {
  let totalCartPrice = 0;
  let totalPriceAfterDiscount = 0;

  // Iterate over each inventory in the cart
  cart.items.forEach((inventoryItem) => {
    let inventoryTotalPrice = 0;
    let inventoryTotalPriceAfterDiscount = 0;

    inventoryItem.drugs.forEach((drug) => {
      // Calculate total price for the drug
      const drugTotal = drug.price * drug.quantity;
      // Ensure discount is a valid number, default to 0 if undefined
      const discount = drug.discount || 0;
      const discountedPrice = drugTotal - (drugTotal * discount) / 100;

      inventoryTotalPrice += drugTotal;
      // Calculate price after discount
      inventoryTotalPriceAfterDiscount += discountedPrice;
      
    });

    // Update inventory-level totals
    inventoryItem.totalInventoryPrice = inventoryTotalPrice;
    inventoryItem.totalInventoryPriceAfterDiscount = inventoryTotalPriceAfterDiscount;
    // Add to cart totals
    totalCartPrice += inventoryTotalPrice;
    totalPriceAfterDiscount += inventoryTotalPriceAfterDiscount;
  });

  // Update cart prices
  cart.totalCartPrice = totalCartPrice;
  cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
  cart.markModified("items");
};

/**
 * @desc    Add a drug to the pharmacy's cart
 * @route   POST /api/v1/cart
 * @access  Private/Pharmacy
 */
const addDrugToCart = expressAsyncHandler(async (req, res, next) => {
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

  //console.log(Only ${drug.stock} units available in stock);

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
          drugs: [{ drug: drugId, quantity, price: drug.price, discount: drug.discount }],
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
        cart.items[inventoryIndex].drugs[drugIndex].discount = drug.discount;
      } else {
        // If the drug does not exist, add it
        cart.items[inventoryIndex].drugs.push({
          drug: drugId,
          quantity,
          price: drug.price,
          discount: drug.discount
        });
      }
    } else {
      // If the inventory does not exist, add it with the new drug
      cart.items.push({
        inventory: inventoryId,
        drugs: [{ drug: drugId, quantity, price: drug.price, discount: drug.discount }],
      });
    }
  }

  // Calculate and update total cart price
  calcTotalCartPrice(cart);
  cart.markModified("items");
  await cart.save();

  return res.status(200).json({
    status: "success",
    message: "Drug added to cart successfully",
    numOfCartItems: cart.items.reduce(
      (acc, item) => acc + item.drugs.reduce((sum, d) => sum + d.quantity, 0),
      0
    ),
    data: {
      _id: cart._id,
      pharmacy: cart.pharmacy,
      totalCartPrice: cart.totalCartPrice,
      totalPriceAfterDiscount: cart.totalPriceAfterDiscount,
      items: cart.items.map((item) => ({
        inventory: item.inventory,
        totalInventoryPrice: item.totalInventoryPrice,
        totalInventoryPriceAfterDiscount: item.totalInventoryPriceAfterDiscount,
        drugs: item.drugs,
      })),
    },
  });
});

export { addDrugToCart };