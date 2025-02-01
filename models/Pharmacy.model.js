import mongoose, { Schema, Types, model } from "mongoose";

const pharmacySchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    pharmacyName: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    identificationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseDocument: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    governorate: {
      type: String,
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"], 
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
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
    imageOfPharmacy: {
      type: String,
    },
    role: {
      type: String,
      enum: ["pharmacy", "admin", "inventory"],
      default: "pharmacy",
    },
  },
  { timestamps: true }
);

pharmacyUserSchema.index({ location: "2dsphere" });

export default model("Pharmacy", pharmacySchema);
