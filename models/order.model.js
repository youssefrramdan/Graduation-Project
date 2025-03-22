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
        },
        quantity: {
          type: Number,
          min: [1, "Quantity must be at least 1"],
        },
        Price: {
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
          timestamp: {
            type: Date,
            default: Date.now,
          },
          note: String,
          updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
        },
      ],
    },
    delivery: {
      address: {
        city: String,
        governorate: String,
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
      (total, item) => total + item.Price * item.quantity,
      0
    );
    this.pricing.total = this.pricing.subtotal + this.pricing.shippingCost;
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

// استخدم هذه الطريقة فقط بدون pre-save
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
    updatedBy: this.status.updatedBy || this.pharmacy,
    timestamp: new Date(),
  });
};

export default model("Order", orderSchema);
