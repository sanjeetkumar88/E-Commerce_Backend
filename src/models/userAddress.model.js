import mongoose from 'mongoose';

const userAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // single-field index for quick lookup
    },
    type: {
      type: String,
      enum: ['home', 'work', 'billing', 'shipping'],
      default: 'home',
    },
    firstName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: true,
      maxlength: 100,
    },
    company: {
      type: String,
      maxlength: 100,
    },
    addressLine1: {
      type: String,
      required: true,
      maxlength: 255,
    },
    addressLine2: {
      type: String,
      maxlength: 255,
    },
    city: {
      type: String,
      required: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      required: true,
      maxlength: 20,
    },
    country: {
      type: String,
      required: true,
      maxlength: 100,
      default: 'India',
    },
    phone: {
      type: String,
      maxlength: 20,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure only one default address per user
userAddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const UserAddress = mongoose.model('UserAddress', userAddressSchema);
