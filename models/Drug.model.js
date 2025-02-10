import { Schema, model } from "mongoose";

const drugSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Drug name is required."],
      trim: true,
    },
    // الشركة المصنعة للدواء
    manufacturer: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    // نوع المنتج: محلي أو مستورد
    originType: {
      type: String,
      enum: ["Imported", "Local"],
      required: [true, "Origin type is required."],
    },
    // تاريخ الإنتاج
    productionDate: {
      type: Date,
      required: [true, "Production date is required."],
    },

    // تاريخ انتهاء الصلاحية
    expirationDate: {
      type: Date,
      required: [true, "Expiration date is required."],
    },

    // السعر الأساسي للدواء
    price: {
      type: Number,
      required: [true, "Base price is required."],
    },

    // نسبة الخصم
    discount: {
      type: Number,
      default: 0,
    },

    // السعر بعد تطبيق الخصم (يتم حسابه تلقائيًا)
    discountedPrice: {
      type: Number,
      default: function () {
        return this.price - (this.price * this.discount) / 100;
      },
    },

    // كمية المخزون المتوفرة
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

drugSchema.pre(/^find/, function (next) {
  this.populate({
    path: "createdBy",
    select: "name",
  });
  next();
});
export default model("Drug", drugSchema);
