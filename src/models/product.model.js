// import mongoose from "mongoose";

// const productSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       maxlength: 255,
//       index: true,
//       trim: true,
//     },

//     description: String,
//     shortDescription: String,

//     categoryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//       index: true,
//     },

//     brand: {
//       type: String,
//       maxlength: 100,
//       index: true,
//     },

//     price: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     discountedPrice: {
//       type: Number,
//       min: 0,
//     },

//     salePrice: {
//       type: Number,
//       min: 0,
//     },

//     stockQuantity: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },

//     soldCount: {
//       type: Number,
//       default: 0,
//       min: 0,
//     },

//     weight: Number,
//     size: { type: String, maxlength: 20 },
//     careInstructions: String,
//     warrantyPeriod: Number,

//     tags: [{ type: String, index: true }],

//     isFeatured: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },

//     isDeleted: {
//       type: Boolean,
//       default: false,
//       index: true,
//     },

//     status: {
//       type: String,
//       enum: ["draft", "active", "inactive", "out_of_stock"],
//       default: "draft",
//       index: true,
//     },
//     sku: {
//       type: String,
//       unique: true,
//       maxlength: 100,
//     },
//   },
//   { timestamps: true }
// );

// /* -------------------------------------------------------------------------- */
// /*                             PRE-SAVE HOOKS                                  */
// /* -------------------------------------------------------------------------- */

// productSchema.pre("save", function () {
//   /* -------------------- PRICE SYNC -------------------- */
//   if (this.discountedPrice != null) {
//     if (this.discountedPrice >= this.price) {
//       return next(new Error("Discounted price must be less than actual price"));
//     }
//     this.salePrice = this.discountedPrice;
//   } else {
//     this.salePrice = undefined;
//   }

//   /* -------------------- STOCK → STATUS -------------------- */
//   if (this.stockQuantity === 0) {
//     this.status = "out_of_stock";
//   } else if (this.status === "out_of_stock") {
//     this.status = "active";
//   }

//   /* -------------------- SOLD COUNT VALIDATION -------------------- */

//   if (this.stockQuantity < 0) {
//     return next(new Error("Stock quantity cannot be negative"));
//   }

//   /* -------------------- SKU Addition -------------------- */

//   if (!this.sku) {
//     // Generate SKU: first 3 letters of product + timestamp
//     const namePart = this.name
//       .replace(/\s+/g, "")
//       .substring(0, 3)
//       .toUpperCase();
//     this.sku = `${namePart}-${Date.now()}`;
//   }

  
// });

// /* -------------------------------------------------------------------------- */
// /*                              COMPOUND INDEXES                               */
// /* -------------------------------------------------------------------------- */

// // Category listing with price filters
// productSchema.index({ categoryId: 1, price: 1 });

// // Category + status (active products fast)
// productSchema.index({ categoryId: 1, status: 1 });

// // Search & filtering
// productSchema.index({ brand: 1, price: 1 });
// productSchema.index({ isFeatured: 1, status: 1 });

// // Soft delete optimization
// productSchema.index({ isDeleted: 1, status: 1 });

// // Category + isActive + isDeleted for category-wise product fetch
// productSchema.index({ categoryId: 1, isActive: 1, isDeleted: 1 });


// productSchema.index(
//   {
//     name: "text",
//     brand: "text",
//     tags: "text",
//   },
//   {
//     weights: {
//       name: 10, // highest priority
//       brand: 5,
//       tags: 3,
//     },
//     name: "ProductTextSearchIndex",
//   }
// );
// /* -------------------------------------------------------------------------- */
// /*                                  VIRTUALS                                   */
// /* -------------------------------------------------------------------------- */

// productSchema.virtual("variants", {
//   ref: "ProductVariant",
//   localField: "_id",
//   foreignField: "productId",
// });

// productSchema.virtual("images", {
//   ref: "ProductImage",
//   localField: "_id",
//   foreignField: "productId",
//   match: { variantId: null },
// });

// productSchema.set("toObject", { virtuals: true });
// productSchema.set("toJSON", { virtuals: true });

// export const Product = mongoose.model("Product", productSchema);


import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    /* -------------------- BASIC INFO -------------------- */
    name: {
      type: String,
      required: true,
      maxlength: 255,
      trim: true,
      index: true,
    },

    description: String,
    shortDescription: String,

    /* -------------------- CATEGORY -------------------- */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    brand: {
      type: String,
      maxlength: 100,
      index: true,
    },

    /* -------------------- PRICING -------------------- */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountedPrice: {
      type: Number,
      min: 0,
    },

    salePrice: {
      type: Number,
      min: 0,
    },

    /* -------------------- STOCK -------------------- */
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* -------------------- EXTRA INFO -------------------- */
    weight: Number,
    size: {
      type: String,
      maxlength: 20,
    },
    careInstructions: String,
    warrantyPeriod: Number,

    tags: [
      {
        type: String,
        index: true,
      },
    ],

    /* -------------------- FLAGS -------------------- */
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

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "out_of_stock"],
      default: "draft",
      index: true,
    },

    /* -------------------- SKU -------------------- */
    sku: {
      type: String,
      unique: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

/* -------------------------------------------------------------------------- */
/*                             PRE-SAVE HOOKS                                  */
/* -------------------------------------------------------------------------- */

productSchema.pre("save", function () {
  /* -------------------- PRICE SYNC -------------------- */
  if (this.discountedPrice != null) {
    if (this.discountedPrice >= this.price) {
      return next(new Error("Discounted price must be less than actual price"));
    }
    this.salePrice = this.discountedPrice;
  } else {
    this.salePrice = undefined;
  }

  /* -------------------- STOCK VALIDATION -------------------- */
  if (this.stockQuantity < 0) {
    return next(new Error("Stock quantity cannot be negative"));
  }

  /* -------------------- STOCK → STATUS -------------------- */
  if (this.stockQuantity === 0) {
    this.status = "out_of_stock";
  } else if (this.status === "out_of_stock") {
    this.status = "active";
  }

  /* -------------------- SKU GENERATION -------------------- */
  if (!this.sku) {
    const namePart = this.name
      .replace(/\s+/g, "")
      .substring(0, 3)
      .toUpperCase();

    this.sku = `${namePart}-${Date.now()}`;
  }

  
});

/* -------------------------------------------------------------------------- */
/*                                   INDEXES                                   */
/* -------------------------------------------------------------------------- */

// Category listing + price filter
productSchema.index({ categoryId: 1, price: 1 });

// Category + active status
productSchema.index({ categoryId: 1, status: 1 });

// Featured products
productSchema.index({ isFeatured: 1, status: 1 });

// Soft delete optimization
productSchema.index({ isDeleted: 1, status: 1 });

// Checkout stock validation
productSchema.index({ _id: 1, stockQuantity: 1 });

// Search optimization
productSchema.index({ brand: 1, price: 1 });

// Category listing fast fetch
productSchema.index({ categoryId: 1, isActive: 1, isDeleted: 1 });

// Text search
productSchema.index(
  {
    name: "text",
    brand: "text",
    tags: "text",
  },
  {
    weights: {
      name: 10,
      brand: 5,
      tags: 3,
    },
    name: "ProductTextSearchIndex",
  }
);

/* -------------------------------------------------------------------------- */
/*                                  VIRTUALS                                   */
/* -------------------------------------------------------------------------- */

productSchema.virtual("isInStock").get(function () {
  return this.stockQuantity > 0;
});

productSchema.virtual("variants", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
});

productSchema.virtual("images", {
  ref: "ProductImage",
  localField: "_id",
  foreignField: "productId",
  match: { variantId: null },
});

productSchema.set("toObject", { virtuals: true });
productSchema.set("toJSON", { virtuals: true });

/* -------------------------------------------------------------------------- */

export const Product = mongoose.model("Product", productSchema);

