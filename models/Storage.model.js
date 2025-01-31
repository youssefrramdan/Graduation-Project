import { Schema, Types, model } from "mongoose";

const StorageSchema = new Schema(
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
    
    StorageName: {
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
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    workingHours: {
      type: String,
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
    stock: [
      {
        type: Types.ObjectId,
        ref: "Stock",
      },
    ],
  },
  { timestamps: true }
);

pharmacyUserSchema.index({ location: "2dsphere" });

export default model("Storage", StorageSchema);
