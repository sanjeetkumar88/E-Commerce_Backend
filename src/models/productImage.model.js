// import mongoose from 'mongoose';

// const productImageSchema = new mongoose.Schema(
//   {
//     imageUrl: { type: String, required: true, maxlength: 500 },
//     public_id: { type: String },
//     productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
//     variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
//   },
//   {
//     timestamps: { createdAt: true, updatedAt: false },
//   }
// );

// export const ProductImage = mongoose.model('ProductImage', productImageSchema);


import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },

    public_id: {
      type: String, // cloudinary / s3 key
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // If null → product-level image
    // If present → variant-specific image
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
    },

    // Used for thumbnails / default display
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

/* -------------------------------------------------------------------------- */
/*                                   INDEXES                                   */
/* -------------------------------------------------------------------------- */

// Product images lookup
productImageSchema.index({ productId: 1, variantId: 1 });

// Only one primary image per product (when variantId is null)
productImageSchema.index(
  { productId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isPrimary: true,
      variantId: null,
    },
  }
);

// Only one primary image per variant
productImageSchema.index(
  { variantId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isPrimary: true,
      variantId: { $ne: null },
    },
  }
);

/* -------------------------------------------------------------------------- */

export const ProductImage = mongoose.model(
  "ProductImage",
  productImageSchema
);

