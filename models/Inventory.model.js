import { Schema, Types, model } from "mongoose";

const inventorySchema = new Schema(
  {
    storageName: {
      type: String,
      trim: true,
      required: [true, "storageName required ..."],
    },
    email: {
      type: String,
      required: [true, "email required ..."],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "password required ..."],
      minlength: [8, "Too short password ..."],
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
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
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
    Drugs: [
      {
        type: Types.ObjectId,
        ref: "Drug",
      },
    ],
    role: {
      type: String,
      enum: ["admin", "inventory"],
      default: "inventory",
    },
  },
  { timestamps: true }
);

inventorySchema.index({ location: "2dsphere" });

export default model("Inventory", inventorySchema);
