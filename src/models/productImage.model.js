import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, maxlength: 500 },
    public_id: { type: String },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ProductImage = mongoose.model('ProductImage', productImageSchema);
