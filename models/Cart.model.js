import { model, Schema, Types } from "mongoose";

const cartSchema = new Schema(
  {
    inventories: [
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
            Price: {
              type: Number,
              required: true,
            },
            totalDrugPrice: {
              type: Number,
              default: 0,
            },
          },
        ],
        totalInventoryPrice: {
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
  },
  { timestamps: true }
);

// Calculate totalDrugPrice and totalInventoryPrice before saving
cartSchema.pre("save", function (next) {
  this.inventories.forEach((inventory) => {
    // Calculate totalDrugPrice for each drug
    inventory.drugs.forEach((drug) => {
      drug.totalDrugPrice = drug.Price * drug.quantity;
    });

    // Calculate totalInventoryPrice
    inventory.totalInventoryPrice = inventory.drugs.reduce(
      (total, drug) => total + drug.totalDrugPrice,
      0
    );
  });
  next();
});

export default model("Cart", cartSchema);
