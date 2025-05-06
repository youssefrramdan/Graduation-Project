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
             // discountedPrice
            Price: {
              type: Number,
              required: true,
            },
            // totalDrugPrice = quantity * Price
            totalDrugPrice: {
              type: Number,
              default: 0,
            },
            freeItems: { type: Number, default: 0 },
            paidQuantity: { type: Number, default: 0 },
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
    inventory.drugs.forEach((drug) => {
      const { promotion, quantity } = drug.drug; // بيانات العرض الترويجي
      let totalPaidQuantity = quantity;

      if (promotion && promotion.isActive) {
        // إذا كان العرض الترويجي مفعل
        const freeItems = Math.floor(totalPaidQuantity / promotion.buyQuantity) * promotion.freeQuantity;
        drug.freeItems = freeItems; // تخزين العناصر المجانية في cart

        totalPaidQuantity -= freeItems; // خفض الكمية المدفوعة بناءً على العرض
      }

      // حساب totalDrugPrice بناءً على الكمية المدفوعة فقط
      drug.totalDrugPrice = drug.Price * totalPaidQuantity;

      // إضافة price * quantity (totalDrugPrice) للـ totalInventoryPrice
    });

    // تحديث totalInventoryPrice
    inventory.totalInventoryPrice = inventory.drugs.reduce(
      (total, drug) => total + drug.totalDrugPrice,
      0
    );
  });
  next();
});


export default model("Cart", cartSchema);
