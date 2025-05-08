import { check } from "express-validator";
import validatorMiddleware from "../../middlewares/validatorMiddleware.js";
import CartModel from "../../models/Cart.model.js";
import OrderModel from "../../models/order.model.js";
import { validateStockAvailability } from "../../services/orderService.js";
import UserModel from "../../models/User.model.js";

export const createOrderValidator = [
  check("cartId")
    .notEmpty()
    .withMessage("Cart ID is required")
    .isMongoId()
    .withMessage("Invalid cart ID format")
    .custom(async (cartId, { req }) => {
      const { inventoryId } = req.body;

      // Find cart and validate ownership
      const cart = await CartModel.findOne({
        _id: cartId,
        pharmacy: req.user._id,
        "inventories.inventory": inventoryId,
      }).populate([
        {
          path: "inventories.inventory",
          select: "name shippingPrice minimumOrderValue",
        },
        {
          path: "inventories.drugs.drug",
          select: "name price promotion",
        },
      ]);

      if (!cart) {
        throw new Error("Cart not found or inventory not in cart");
      }

      // Extract inventory items from cart
      const inventoryItems = cart.inventories.find(
        (item) => item.inventory._id.toString() === inventoryId
      );

      if (!inventoryItems) {
        throw new Error("Inventory not found in cart");
      }

      // Get inventory details including minimum order value
      const inventory =
        await UserModel.findById(inventoryId).select("minimumOrderValue");

    //   // Check if order meets minimum value requirement
    //   if (inventoryItems.totalInventoryPrice < inventory.minimumOrderValue) {
    //     throw new Error(
    //       `Order total (${inventoryItems.totalInventoryPrice}) is less than the minimum required value (${inventory.minimumOrderValue})`
    //     );
    //   }

      // Validate stock availability
      const { isValid, unavailableItems } = await validateStockAvailability(
        inventoryItems.drugs
      );

      if (!isValid) {
        throw new Error(
          `Some items are out of stock: ${unavailableItems
            .map((i) => i.name)
            .join(", ")}`
        );
      }

      // Store cart and inventory items in request
      req.cart = cart;
      req.inventoryItems = inventoryItems;
      return true;
    }),

  check("inventoryId")
    .notEmpty()
    .withMessage("Inventory ID is required")
    .isMongoId()
    .withMessage("Invalid inventory ID format"),

  validatorMiddleware,
];

export const updateOrderStatusValidator = [
  check("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID format")
    .custom(async (id, { req }) => {
      const { status, note } = req.body;

      const order = await OrderModel.findById(id);
      if (!order) {
        throw new Error("Order not found");
      }

      if (!order.canTransitionTo(status)) {
        throw new Error(
          `Cannot change status from ${order.status.current} to ${status}`
        );
      }

      req.order = order;
      return true;
    }),

  check("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "rejected",
    ])
    .withMessage("Invalid status"),

  check("note").optional().isString().withMessage("Note must be a string"),

  validatorMiddleware,
];

export const cancelOrderValidator = [
  check("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID format")
    .custom(async (id, { req }) => {
      if (req.user.role === "inventory") {
        throw new Error("You can't do this action");
      }

      const order = await OrderModel.findOne({
        _id: id,
        pharmacy: req.user._id,
        "status.current": { $in: ["pending", "confirmed"] },
      });

      if (!order) {
        throw new Error(
          "Order not found or cannot be cancelled at current status"
        );
      }

      req.order = order;
      return true;
    }),

  check("reason")
    .notEmpty()
    .withMessage("Cancellation reason is required")
    .isString()
    .withMessage("Reason must be a string"),

  validatorMiddleware,
];

export const rejectOrderValidator = [
  check("id")
    .notEmpty()
    .withMessage("Order ID is required")
    .isMongoId()
    .withMessage("Invalid order ID format")
    .custom(async (id, { req }) => {
      if (req.user.role === "pharmacy") {
        throw new Error("You can't do this action");
      }

      const order = await OrderModel.findOne({
        _id: id,
        "status.current": { $in: ["pending", "confirmed"] },
      });

      if (!order) {
        throw new Error(
          "Order not found or cannot be rejected at current status"
        );
      }

      req.order = order;
      return true;
    }),

  check("reason")
    .notEmpty()
    .withMessage("Rejection reason is required")
    .isString()
    .withMessage("Reason must be a string"),

  validatorMiddleware,
];
