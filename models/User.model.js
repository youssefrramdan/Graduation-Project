import { Schema, Types, model } from "mongoose";
// eslint-disable-next-line import/no-extraneous-dependencies
import bcrypt from "bcryptjs";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      trim: true,
      enum: ["pharmacy", "inventory", "admin"],
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: [8, "Password must be at least 8 characters long."],
    },
    ownerName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/039/845/042/non_2x/male-default-avatar-profile-gray-picture-grey-photo-placeholder-gray-profile-anonymous-face-picture-illustration-isolated-on-white-background-free-vector.jpg",
    },
    city: {
      type: String,
      trim: true,
    },
    governorate: {
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
    drugs: [
      {
        type: Types.ObjectId,
        ref: "Drug",
      },
    ],
    favourite: [{
      type: Types.ObjectId,
      ref: 'User',
      default: [],
    }],   
    minimumOrderValue: {
      type: Number,
      default: 1000,
    },
    shippingPrice: {
      type: Number,
      default: 0,
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
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
    offer: {  
      type: Number,
      default: 0,
    },
    fcmToken: {
      type: String,
    },
    passwordResetExpires: Date,
    passwordResetCode: String,
    passwordResetVerified: Boolean,
    passwordChangedAt: Date,
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

userSchema.methods.saveFCMToken = async function (token) {
  this.fcmToken = token;
  await this.save();
};

// Pre middleware to delete associated data when user is removed
userSchema.pre("findOneAndDelete", async function (next) {
  try {
    const user = await this.model.findOne(this.getQuery());
    if (!user) return next();

    await Promise.all([
      model("Drug").deleteMany({ createdBy: user._id }),
      model("Cart").deleteMany({ pharmacy: user._id }),
      model("Order").deleteMany({ pharmacy: user._id }),
      model("User").findByIdAndUpdate(user._id),
    ]);

    next();
  } catch (error) {
    console.error("Error while removing user-related data:", error);
    next(error);
  }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 });
userSchema.index({ city: 1, governorate: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: "2dsphere" });
userSchema.index({ active: 1 }, { partialFilterExpression: { active: true } });

export default model("User", userSchema);
