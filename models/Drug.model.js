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

// الفهارس المطلوبة لتسريع استعلام getAllDrugs
drugSchema.index({ createdBy: 1 });
drugSchema.index({ name: "text", description: "text" });
drugSchema.index({ price: 1 });
drugSchema.index({ stock: 1 });
drugSchema.index({ productionDate: 1 });
drugSchema.index({ expirationDate: 1 });

// الفهارس المركبة للاستعلامات الشائعة
drugSchema.index({ price: 1, stock: 1 });
drugSchema.index({ productionDate: 1, expirationDate: 1 });

export default model("Drug", drugSchema);
