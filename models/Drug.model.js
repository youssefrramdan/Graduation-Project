import { Schema, model } from "mongoose";

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
  },
  { timestamps: true }
);

drugSchema.pre("save", function (next) {
  this.discountedPrice = this.price - (this.price * this.discount) / 100;
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
