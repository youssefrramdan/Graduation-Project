import { model, Schema, Types } from "mongoose";

const orderSchema = new Schema(
  {
    pharmacy: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a pharmacy"],
    },
    inventory: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to an inventory"],
    },
    drugs: [
      {
        drug: {
          type: Types.ObjectId,
          ref: "Drug",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        discountedPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    taxPrice: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "delivered", "cancelled"],
      default: "pending",
    },
    totalOrderPrice: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card"],
      default: "cash",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected", "delivered", "cancelled"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { pharmacy: 1 },
      { inventory: 1 },
      { createdAt: -1 },
      { orderStatus: 1 },
    ],
  }
);

// Middleware to update statusHistory when order status changes
orderSchema.pre("save", function (next) {
  if (this.isModified("orderStatus")) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
    });
  }
  next();
});

export default model("Order", orderSchema);
