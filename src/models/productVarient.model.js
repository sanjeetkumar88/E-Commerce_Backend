import mongoose from "mongoose";
import { Product } from "./product.model.js";
import { generateSKU } from "../utils/sku.js";

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    color: {
      type: String,
      trim: true,
    },

    size: {
      type: String,
      trim: true,
    },

    variantType: {
      type: String,
      enum: ["standard", "color", "size", "color_size"],
      default: "standard",
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountedPrice: {
      type: Number,
      min: 0,
    },

    salePrice: Number,

    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      unique: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/*                               PRE SAVE HOOK                                 */
/* -------------------------------------------------------------------------- */

productVariantSchema.pre("save", async function () {
  /* ---------------- VARIANT TYPE ---------------- */
  if (this.color && this.size) {
    this.variantType = "color_size";
  } else if (this.color) {
    this.variantType = "color";
  } else if (this.size) {
    this.variantType = "size";
  } else {
    this.variantType = "standard";
  }

  /* ---------------- PRICE SYNC ---------------- */
  if (this.discountedPrice != null) {
    if (this.discountedPrice >= this.price) {
      throw new Error("Discounted price must be less than actual price");
    }
    this.salePrice = this.discountedPrice;
  } else {
    this.salePrice = undefined;
  }

  /* ---------------- SKU GENERATION ---------------- */

  
  if (!this.sku) {
    const product = await Product.findById(this.productId).select("name");
    if (!product) {
      throw new Error("Product not found for SKU generation");
    }
     const productName = product.name;
    if (typeof productName !== "string") {
      throw new Error(`Invalid product name: expected string but got ${typeof productName}`);
    }
    let skuExists = true;

    while (skuExists) {
      const sku = generateSKU({
        productName: productName,
        color: this.color,
        size: this.size,
      });

      skuExists = await mongoose.models.ProductVariant.exists({ sku });

      if (!skuExists) {
        this.sku = sku;
      }
    }
  }
});

/* -------------------------------------------------------------------------- */
/*                              INDEXES (IMPORTANT)                             */
/* -------------------------------------------------------------------------- */

// Prevent duplicate variants (same color + size)
productVariantSchema.index(
  { productId: 1, color: 1, size: 1 },
  { unique: true }
);

// Only one default variant per product
productVariantSchema.index(
  { productId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

/* ---------------- VIRTUALS ---------------- */
productVariantSchema.virtual("images", {
  ref: "ProductImage",
  localField: "_id",
  foreignField: "variantId",
});

productVariantSchema.set("toObject", { virtuals: true });
productVariantSchema.set("toJSON", { virtuals: true });

/* -------------------------------------------------------------------------- */

export const ProductVariant = mongoose.model(
  "ProductVariant",
  productVariantSchema
);
