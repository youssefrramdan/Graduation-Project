import { Schema, Types, model } from "mongoose";

const pharmacySchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "email required ..."],
      unique: [true,"email must be unique"],
    },
    password: {
      type: String,
      required: [true, "passsword required ..."],
      minlength: [8, "Too short password ..."],
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
      enum: ["pharmacy", "admin"],
      default: "pharmacy",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  { timestamps: true }
);

pharmacySchema.index({ location: "2dsphere" });

export default model("Pharmacy", pharmacySchema);
