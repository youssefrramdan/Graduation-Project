import CartModel from "../models/Cart.model.js";
import DrugModel from "../models/Drug.model.js";

// Calculate promotional items
export const calculatePromotionalItems = (drug, quantity) => {
  let freeItems = 0;
  let paidQuantity = quantity;

  if (
    drug.promotion?.isActive &&
    drug.promotion?.buyQuantity > 0 &&
    drug.promotion?.freeQuantity > 0
  ) {
    const { buyQuantity, freeQuantity } = drug.promotion;

    // Calculate how many complete promotional offers we can apply
    const fullOffers = Math.floor(quantity / buyQuantity);
    freeItems = fullOffers * freeQuantity;

    // Calculate remaining items that don't qualify for promotion
    const remainingItems = quantity % buyQuantity;
    paidQuantity = fullOffers * buyQuantity + remainingItems;
  }

  return {
    freeItems,
    paidQuantity,
    totalDelivered: paidQuantity + freeItems,
  };
};

// Calculate drug price details
export const calculateDrugPriceDetails = (drug, paidQuantity) => {
  const unitPrice = drug.discountedPrice || drug.price;
  const totalDrugPrice = unitPrice * paidQuantity;

  return {
    unitPrice,
    totalDrugPrice,
  };
};

// Add or update drug in cart
export const addOrUpdateDrugInCart = async (
  cart,
  drug,
  inventoryId,
  quantity
) => {
  const { freeItems, paidQuantity, totalDelivered } = calculatePromotionalItems(
    drug,
    quantity
  );
  const { unitPrice, totalDrugPrice } = calculateDrugPriceDetails(
    drug,
    paidQuantity
  );

  const inventoryIndex = cart.inventories.findIndex((item) =>
    item.inventory.equals(inventoryId)
  );

  if (inventoryIndex > -1) {
    const drugIndex = cart.inventories[inventoryIndex].drugs.findIndex((d) =>
      d.drug.equals(drug._id)
    );

    if (drugIndex > -1) {
      // Update existing drug
      const drugEntry = cart.inventories[inventoryIndex].drugs[drugIndex];
      const oldQuantity = drugEntry.paidQuantity;
      const newQuantity = oldQuantity + quantity;

      // Recalculate promotional items for the new total quantity
      const {
        freeItems: newFreeItems,
        paidQuantity: newPaidQuantity,
        totalDelivered: newTotalDelivered,
      } = calculatePromotionalItems(drug, newQuantity);

      const { totalDrugPrice: newTotalDrugPrice } = calculateDrugPriceDetails(
        drug,
        newPaidQuantity
      );

      drugEntry.quantity = newTotalDelivered;
      drugEntry.paidQuantity = newPaidQuantity;
      drugEntry.freeItems = newFreeItems;
      drugEntry.totalDelivered = newTotalDelivered;
      drugEntry.totalDrugPrice = newTotalDrugPrice;
      drugEntry.Price = unitPrice;
    } else {
      // Add new drug to existing inventory
      cart.inventories[inventoryIndex].drugs.push({
        drug: drug._id,
        quantity: totalDelivered,
        paidQuantity,
        Price: unitPrice,
        freeItems,
        totalDelivered,
        totalDrugPrice,
      });
    }
  } else {
    // Add new inventory with drug
    cart.inventories.push({
      inventory: inventoryId,
      drugs: [
        {
          drug: drug._id,
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

  // Update total inventory price
  cart.inventories.forEach((inventory) => {
    inventory.totalInventoryPrice = inventory.drugs.reduce(
      (total, drugItem) => total + drugItem.totalDrugPrice,
      0
    );
  });

  return cart;
};

// Validate drug availability
export const validateDrugAvailability = async (
  drugId,
  quantity,
  pharmacyId
) => {
  const drug = await DrugModel.findById(drugId)
    .populate("createdBy")
    .select("price discountedPrice stock createdBy status promotion");

  if (!drug) {
    throw new Error("Drug not found");
  }

  if (!drug.stock || drug.stock === 0) {
    throw new Error("Drug is out of stock");
  }

  const { totalDelivered } = calculatePromotionalItems(drug, quantity);

  if (drug.stock < totalDelivered) {
    throw new Error(`Only ${drug.stock} items available from this drug`);
  }

  if (pharmacyId.equals(drug.createdBy._id)) {
    throw new Error("Cannot add your own drugs to cart");
  }

  return drug;
};

// Check cart quantity
export const checkCartQuantity = async (
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
        return total + (drugItem ? drugItem.totalDelivered : 0);
      },
      0
    );

    const drug = await DrugModel.findById(drugId).select("promotion");
    const { totalDelivered } = calculatePromotionalItems(drug, newQuantity);
    const totalQuantity = currentQuantity + totalDelivered;

    if (totalQuantity > drugStock) {
      throw new Error(
        `Cannot add ${newQuantity} units. You already have ${currentQuantity} units in cart. Maximum available: ${drugStock}`
      );
    }

    return { existingCart, currentQuantity };
  }

  return { existingCart: null, currentQuantity: 0 };
};

// Transform cart data for response
export const transformCart = (cart) => ({
  id: cart._id,
  pharmacy: cart.pharmacy,
  totalItems: cart.inventories.reduce(
    (acc, inventory) => acc + inventory.drugs.length,
    0
  ),
  totalPrice: cart.inventories.reduce(
    (acc, inventory) => acc + inventory.totalInventoryPrice,
    0
  ),
  inventories: cart.inventories.map((inventory) => ({
    id: inventory._id,
    inventory: {
      id: inventory.inventory._id,
      name: inventory.inventory.name,
      shippingPrice: inventory.inventory.shippingPrice,
    },
    drugs: inventory.drugs.map((drugItem) => ({
      id: drugItem._id,
      drug: {
        id: drugItem.drug._id,
        name: drugItem.drug.name,
        promotion: drugItem.drug.promotion,
      },
      quantity: drugItem.quantity,
      price: drugItem.Price,
      totalPrice: drugItem.totalDrugPrice,
      paidQuantity: drugItem.paidQuantity,
      freeItems: drugItem.freeItems,
      totalDelivered: drugItem.totalDelivered,
    })),
    totalInventoryPrice: inventory.totalInventoryPrice,
  })),
  createdAt: cart.createdAt,
  updatedAt: cart.updatedAt,
});
