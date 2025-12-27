import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantType: { type: String, required: true, maxlength: 50 },
    variantValue: { type: String, required: true, maxlength: 100 },
    priceAdjustment: { type: Number, default: 0 },
    stockQuantity: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Virtual to populate images
productVariantSchema.virtual("images", {
  ref: "ProductImage",
  localField: "_id",
  foreignField: "variantId",
});
productVariantSchema.set("toObject", { virtuals: true });
productVariantSchema.set("toJSON", { virtuals: true });

export const ProductVariant = mongoose.model(
  "ProductVariant",
  productVariantSchema
);
