import mongoose from "mongoose";
import { Product } from "./product.model.js";
import { generateSKU } from "../utils/sku.js";
import { generate16DigitId } from "../utils/numGen.js"; 

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    shiprocketVariantId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
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

    salePrice: {
      type: Number,
      min: 0,
    },

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

    weight: {
      type: Number,
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    hsnCode: {
      type: String,
      trim: true,
    },

    taxRate: {
      type: Number,
      min: 0,
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
if (this.salePrice != null) {
  if (this.salePrice >= this.price) {
    throw new Error("Sale price must be less than actual price");
  }
} else {
  this.salePrice = undefined;
}

  /* ---------------- SKU GENERATION ---------------- */

  
  if (!this.sku) {

    const product = await Product.findById(this.productId).select("name").session(this.$session());

    if (!product) {
      throw new Error("Product not found for SKU generation");
    }
     const productName = product.name;
     console.log("Product Name for SKU Generation:", productName);
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

  if(!this.shiprocketVariantId) {
    this.shiprocketVariantId = generate16DigitId();
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
