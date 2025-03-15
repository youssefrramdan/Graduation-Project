import { model, Schema, Types } from "mongoose";
import DrugModel from "./Drug.model.js";

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

cartSchema.pre("save", async function (next) {
  try {
    for (const item of this.items) {
      for (const drugItem of item.drugs) {
        const drugDetails = await DrugModel.findById(drugItem.drug);
        if (!drugDetails) {
          throw new Error(`Drug with id ${drugItem.drug} not found`);
        }
        drugItem.price = drugDetails.price;
        drugItem.discountedPrice = drugDetails.discountedPrice;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default model("Cart", cartSchema);
