import OrderModel from "../models/order.model.js";
import DrugModel from "../models/Drug.model.js";
import CartModel from "../models/Cart.model.js";

// Transform order data for response
export const transformOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  status: order.status.current,
  statusHistory: order.status.history,
  paymentStatus: order.payment?.status,
  paymentPaidAt: order.payment?.paidAt,
  inventory: order.inventory && {
    _id: order.inventory._id,
    name: order.inventory.name,
  },
  pharmacy: order.pharmacy && {
    _id: order.pharmacy._id,
    name: order.pharmacy.name,
    phone: order.pharmacy.phone,
  },
  pricing: {
    subtotal: order.pricing.subtotal,
    shippingCost: order.pricing.shippingCost,
    total: order.pricing.total,
  },
  drugs: order.drugs.map((drug) => ({
    drug: {
      _id: drug.drug._id,
      name: drug.drug.name,
      price: drug.price,
      promotion: drug.drug.promotion,
    },
    quantity: drug.quantity,
    paidQuantity: drug.paidQuantity,
    freeItems: drug.freeItems,
    totalDelivered: drug.totalDelivered,
    totalPrice: drug.totalPrice,
  })),
  delivery: {
    address: order.delivery.address,
    location: order.delivery.location,
    contactPhone: order.delivery.contactPhone,
    actualDeliveryDate: order.delivery.actualDeliveryDate,
  },
  createdAt: order.createdAt,
});

// Validate stock availability
export const validateStockAvailability = async (drugs) => {
  const stockCheck = await Promise.all(
    drugs.map(async (item) => {
      const drug = await DrugModel.findById(item.drug._id).select("stock name");
      return {
        drug: item.drug._id,
        name: drug.name,
        requested: item.totalDelivered,
        available: drug.stock,
      };
    })
  );

  const unavailableItems = stockCheck.filter(
    (item) => item.requested > item.available
  );

  return {
    isValid: unavailableItems.length === 0,
    unavailableItems,
  };
};

// Update drug stock
export const updateDrugStock = async (drugs, isCancellation = false) => {
  const updatePromises = drugs.map(async (item) => {
    const drug = await DrugModel.findById(item.drug._id);
    if (!drug) return;

    const quantity = item.totalDelivered || 0;
    const stockChange = isCancellation ? quantity : -quantity;

    // Ensure stock is a valid number
    const currentStock = Number(drug.stock) || 0;
    const newStock = Math.max(0, currentStock + stockChange);

    return DrugModel.findByIdAndUpdate(
      item.drug._id,
      { $set: { stock: newStock } },
      { new: true }
    );
  });

  await Promise.all(updatePromises);
};

// Get populated order
export const getPopulatedOrder = async (orderId) =>
  OrderModel.findById(orderId)
    .populate({
      path: "inventory",
      select: "_id name location",
    })
    .populate({
      path: "pharmacy",
      select: "_id name phone fcmToken",
    })
    .populate({
      path: "drugs.drug",
      select: "name price promotion",
    });

// Handle cart cleanup
export const handleCartCleanup = async (cartId) => {
  const cart = await CartModel.findById(cartId);
  if (!cart || cart.inventories.length > 0) return;

  await CartModel.findByIdAndDelete(cartId);
};
