import mongoose, { Schema, model } from "mongoose";

const drugSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Drug name is required."],
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    originType: {
      type: String,
      enum: ["Imported", "Local"],
      required: [true, "Origin type is required."],
    },
    productionDate: {
      type: Date,
      required: [true, "Production date is required."],
    },
    expirationDate: {
      type: Date,
      required: [true, "Expiration date is required."],
    },
    price: {
      type: Number,
      required: [true, "Base price is required."],
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountedPrice: {
      type: Number,
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required."],
    },
    sold: {
      type: Number,
      default: 0,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    imageCover: [String],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    promotion: {
      isActive: {
        type: Boolean,
        default: false,
      },
      buyQuantity: {
        type: Number,
        min: [1, "Buy quantity must be at least 1"],
      },
      freeQuantity: {
        type: Number,
        min: [1, "Free quantity must be at least 1"],
      },
      originalDrugId: {
        type: Schema.Types.ObjectId,
        ref: "Drug",
      },
    },
  },
  { timestamps: true }
);

// Calculate discounted price and handle promotion stock
drugSchema.pre("save", async function (next) {
  // Calculate base discounted price
  this.discountedPrice = this.price - (this.price * (this.discount || 0)) / 100;

  // Handle promotion logic
  if (this.promotion?.isActive && this.promotion.originalDrugId) {
    const originalDrug = await mongoose
      .model("Drug")
      .findById(this.promotion.originalDrugId);

    if (!originalDrug) {
      return next(new Error("Original drug not found for promotion"));
    }

    
  }
  next();
});

drugSchema.index({ createdBy: 1 });
drugSchema.index({ createdBy: 1, price: 1 });
drugSchema.index({ createdBy: 1, stock: 1 });
drugSchema.index({ createdBy: 1, expirationDate: 1 });
drugSchema.index({ price: 1 });
drugSchema.index({ stock: 1 });
drugSchema.index({ productionDate: 1 });
drugSchema.index({ productionDate: 1, expirationDate: 1 });
drugSchema.index({ location: "2dsphere" });

drugSchema.index(
  { isVisible: 1 },
  { partialFilterExpression: { isVisible: true } }
);
drugSchema.index(
  { name: "text", description: "text" },
  {
    weights: { name: 1, description: 1 },
    default_language: "english",
  }
);

export default model("Drug", drugSchema);
