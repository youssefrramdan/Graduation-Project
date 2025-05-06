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

// Update drug stock levels
export const updateDrugStock = async (drugs, increment = false) => {
  const multiplier = increment ? 1 : -1;
  return Promise.all(
    drugs.map((item) =>
      DrugModel.updateOne(
        { _id: item.drug._id },
        { $inc: { stock: multiplier * item.totalDelivered } }
      )
    )
  );
};

// Get populated order
export const getPopulatedOrder = async (orderId) => {
  return OrderModel.findById(orderId)
    .populate("inventory", "name location")
    .populate("pharmacy", "name phone location")
    .populate("drugs.drug", "name price promotion");
};

// Handle cart cleanup after order
export const handleCartCleanup = async (cartId) => {
  const updatedCart = await CartModel.findById(cartId);
  if (updatedCart && updatedCart.inventories.length > 0) {
    await updatedCart.save();
  } else if (updatedCart) {
    await CartModel.findByIdAndDelete(cartId);
  }
};
