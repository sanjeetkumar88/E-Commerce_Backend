import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 255,
    },
    password: {
      type: String,
      required: true,
      maxlength: 1024,
    },
    firstName: {
      type: String,
      required: true,
      maxlength: 100,
      default: "No Name",
    },
    lastName: {
      type: String,
      maxlength: 100,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: true,
      maxlength: 20,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["female", "male", "other"],
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for addresses
userSchema.virtual("addresses", {
  ref: "UserAddress",
  localField: "_id",
  foreignField: "userId",
});

// Ensure virtuals appear in JSON
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });


userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});


userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      name: this.firstName + " " + (this.lastName || ""),
      mobile: this.phoneNumber,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
