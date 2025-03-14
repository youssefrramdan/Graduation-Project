import { model, Schema, Types } from "mongoose";

const cartSchema = new Schema(
  {
    items: [
      {
        inventory: {
          type: Types.ObjectId,
          ref: "User",
          required: true,
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
            price: {
              type: Number,
              required: true,
            },
            discountedPrice: {
              type: Number,
              required: true,
            },
          },
        ],
        totalInventoryPrice: {
          type: Number,
          default: 0,
        },
        totalInventoryPriceAfterDiscount: {
          type: Number,
          default: 0,
        },
      },
    ],
    pharmacy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalCartPrice: Number,
    totalCartAfterDiscount: Number,
  },
  { timestamps: true }
);
export default model("Cart", cartSchema);
