import { model, Schema, Types } from "mongoose";

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
    },
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
        },
        quantity: {
          type: Number,
          min: [1, "Quantity must be at least 1"],
        },
        price: {
          type: Number,
        },
        discountedPrice: {
          type: Number,
        },
      },
    ],
    pricing: {
      subtotal: {
        type: Number,
      },
      shippingCost: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
      },
    },
    payment: {
      method: {
        type: String,
        enum: ["cash", "card"],
        default: "cash",
      },
      status: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending",
      },
      paidAt: Date,
    },
    status: {
      current: {
        type: String,
        enum: [
          "pending",
          "confirmed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "rejected",
        ],
        default: "pending",
      },
      history: [
        {
          status: {
            type: String,
            enum: [
              "pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "rejected",
            ],
            required: true,
          },
          note: String,
          changedBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
          },
          timestamp: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    delivery: {
      address: {
        street: String,
        city: String,
        governorate: String,
        details: String,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      contactPhone: String,
      actualDeliveryDate: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ pharmacy: 1, createdAt: -1 });
orderSchema.index({ inventory: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ "status.current": 1 });

// Generate order number before saving
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const timestampPart = Date.now().toString().slice(-8);
    const inventoryPart = this.inventory.toString().slice(-4);
    this.orderNumber = `INV-${inventoryPart}-${timestampPart}-${randomPart}`;
  }
  next();
});

// Calculate totals before saving
orderSchema.pre("save", function (next) {
  if (this.isModified("drugs") || this.isNew) {
    this.pricing.subtotal = this.drugs.reduce(
      (total, item) => total + item.discountedPrice * item.quantity,
      0
    );
    this.pricing.total = this.pricing.subtotal + this.pricing.shippingCost;
  }
  next();
});

// Update status history
orderSchema.pre("save", function (next) {
  if (this.isModified("status.current")) {
    if (!this.status.history) {
      this.status.history = [];
    }
    this.status.history.push({
      status: this.status.current,
      timestamp: new Date(),
      changedBy: this.status.changedBy || this.pharmacy,
    });
  }
  next();
});

// Methods
orderSchema.methods.canTransitionTo = function (newStatus) {
  const validTransitions = {
    pending: ["confirmed", "cancelled", "rejected"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
    rejected: [],
  };

  return validTransitions[this.status.current]?.includes(newStatus) || false;
};

orderSchema.methods.updateStatus = function (newStatus, note, userId) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(
      `Cannot transition from ${this.status.current} to ${newStatus}`
    );
  }

  this.status.current = newStatus;
  this.status.history.push({
    status: newStatus,
    note,
    changedBy: userId,
    timestamp: new Date(),
  });
};

export default model("Order", orderSchema);
