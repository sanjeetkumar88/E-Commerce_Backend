import mongoose from "mongoose";
import { generate16DigitId } from "../utils/numGen.js";

const productSchema = new mongoose.Schema(
  {
    /* ---------------- BASIC INFO ---------------- */
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
    },

    shortDescription: {
      type: String,
    },

    shiprocketProductId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    craftmenshipDetails: {
      type: String,
    },
    
    luxeMaterials: {
      type: String,
    },

    productSpecifications: {
      type: String,
    },

    capacityAndDimensions: {
      type: String,
    },

    stylingInspiration: {
      type: String,
    },

    occasionsAndUsage: {
      type: String,
    },

    careGuide: {
      type: String,
    },

    /* ---------------- CATEGORY & BRAND ---------------- */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    brand: {
      type: String,
      index: true,
      trim: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    /* ---------------- FLAGS ---------------- */
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* ---------------- STATUS ---------------- */
    status: {
      type: String,
      enum: ["draft", "active", "inactive"],
      default: "draft",
      index: true,
    },

    handle: {
      type: String,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);


/* -------------------------------------------------------------------------- */
/*                                   PRE HOOKS                                */
/* -------------------------------------------------------------------------- */

productSchema.pre("save", async function () {
  // Ensure only one default variant per product
  if (this.isModified("isDefault") && this.isDefault) {
    await mongoose.model("ProductVariant").updateMany(
      { productId: this.productId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  if(!this.shiprocketProductId){
    this.shiprocketProductId = generate16DigitId();
  }
});

/* -------------------------------------------------------------------------- */
/*                                   INDEXES                                   */
/* -------------------------------------------------------------------------- */

// Category listing (most used query)
productSchema.index({ categoryId: 1, status: 1, isDeleted: 1 });

// Featured products
productSchema.index({ isFeatured: 1, status: 1 });

// Active + not deleted
productSchema.index({ isActive: 1, isDeleted: 1 });

// Brand filtering
productSchema.index({ brand: 1, status: 1 });

productSchema.index({status: 1, isDeleted: 1});
productSchema.index({createdAt: -1});
productSchema.index({name: "text"});



// Text search index
productSchema.index(
  { name: "text", brand: "text", tags: "text" },
  { weights: { name: 10, brand: 5, tags: 3 }, name: "ProductTextSearchIndex" }
);



/* -------------------------------------------------------------------------- */
/*                                   VIRTUALS                                  */
/* -------------------------------------------------------------------------- */

// All variants of the product
productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
});

// Default variant (used for listing, price, checkout)
productSchema.virtual("defaultVariant", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
  justOne: true,
  options: {
    match: { isDefault: true, isActive: true },
  },
});

// Product images (optional, if you use ProductImage model)
productSchema.virtual("images", {
  ref: "ProductImage",
  localField: "_id",
  foreignField: "productId",
});

/* -------------------------------------------------------------------------- */
/*                              VIRTUAL SETTINGS                               */
/* -------------------------------------------------------------------------- */

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

/* -------------------------------------------------------------------------- */

export const Product = mongoose.model("Product", productSchema);
