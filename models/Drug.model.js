import { Schema, model } from "mongoose";

const drugSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Drug name is required."],
      trim: true,
    },

    // المادة الفعالة في الدواء
    activeIngredient: {
      type: String,
      required: [true, "Active ingredient is required."],
      trim: true,
    },

    // الشركة المصنعة للدواء
    manufacturer: {
      type: String,
      trim: true,
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

    // عدد الوحدات المباعة
    sold: {
      type: Number,
      default: 0,
    },

    // نوع المنتج: محلي أو مستورد
    originType: {
      type: String,
      enum: ["Imported", "Local"],
      required: [true, "Origin type is required."],
    },

    // حالة العرض: مفعل أو معطل
    isVisible: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Drug", drugSchema);
