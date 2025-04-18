import { Schema, Types, model } from "mongoose";
// eslint-disable-next-line import/no-extraneous-dependencies
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters long."],
    },
    passwordResetExpires: Date,
    passwordResetCode: String,
    passwordResetVerified: Boolean,
    passwordChangedAt: Date,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    identificationNumber: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    licenseDocument: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
    },
    city: {
      type: String,
      trim: true,
    },
    governorate: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
    drugs: [
      {
        type: Types.ObjectId,
        ref: "Drug",
      },
    ],
    files: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    minimumOrderValue: Number,
    shippingPrice: {
      type: Number,
      default: 0,
    },
    orders: [
      {
        type: Types.ObjectId,
        ref: "Order",
      },
    ],
    cart: [
      {
        type: Types.ObjectId,
        ref: "Cart",
      },
    ],
    role: {
      type: String,
      trim: true,
      enum: ["pharmacy", "inventory", "admin"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        validate: {
          validator: function (val) {
            return (
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 &&
              val[1] >= -90 &&
              val[1] <= 90
            );
          },
          message:
            "Location coordinates must contain exactly [longitude, latitude].",
        },
      },
    },
  },
  { timestamps: true }
);

// Pre middleware For Hasing Password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Hasing User Password
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre middleware to delete associated data when user is removed
userSchema.pre("remove", async function (next) {
  try {
    console.log(`Attempting to delete user with ID: ${this._id}`);

    const drugs = await model("Drug").find({ createdBy: this._id });
    console.log("Drugs to be deleted:", drugs);

    const carts = await model("Cart").find({ pharmacy: this._id });
    console.log("Carts to be deleted:", carts);

    const orders = await model("Order").find({ pharmacy: this._id });
    console.log("Orders to be deleted:", orders);

    await Promise.all([
      model("Drug").deleteMany({ createdBy: this._id }),
      model("Cart").deleteMany({ pharmacy: this._id }),
      model("Order").deleteMany({ pharmacy: this._id }),
    ]);

    console.log("User-related data deleted successfully.");
    next(); // إتمام العملية إذا تم الحذف بنجاح
  } catch (error) {
    console.error("Error while removing user-related data:", error);
    next(error); // تمرير الخطأ في حال حدوث مشكلة
  }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ city: 1, governorate: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: "2dsphere" });
userSchema.index({ active: 1 }, { partialFilterExpression: { active: true } });

export default model("User", userSchema);
