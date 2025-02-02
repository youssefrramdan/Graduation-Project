import { Schema, Types, model } from "mongoose";
// eslint-disable-next-line import/no-extraneous-dependencies
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters long."],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    identificationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
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
      required: true,
      trim: true,
    },
    governorate: {
      type: String,
      required: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    drugs: [
      {
        type: Types.ObjectId,
        ref: "Drug",
      },
    ],
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
      default: "pharmacy",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (val) {
            return val.length === 2; 
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

// Indexing for geospatial queries
userSchema.index({ location: "2dsphere" });

export default model("User", userSchema);
