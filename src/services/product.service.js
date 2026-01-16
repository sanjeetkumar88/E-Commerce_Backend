import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

/* ---------------- CREATE PRODUCT + VARIANTS ---------------- */
// export const createProductService = async ({ productData, variants = [] }) => {
//   // 1. Create the product
//   const product = await Product.create(productData);

//   // 2. Create variants
//   const variantDocs = [];
//   for (const variant of variants) {
//     try {
//       const variantDoc = await ProductVariant.create({
//         ...variant,
//         productId: product._id,
//       });
//       variantDocs.push(variantDoc);
//     } catch (err) {
//       // Rollback if variant fails
//       await Product.findByIdAndDelete(product._id);
//       throw new ApiError(400, `Variant creation failed: ${err.message}`);
//     }
//   }

//   return { product, variants: variantDocs };
// };

export const createProductService = async ({ productData, variants = [] }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /* ---------------- CREATE PRODUCT ---------------- */
    const [product] = await Product.create([productData], { session });

    if (!variants.length) {
      throw new ApiError(400, "At least one product variant is required");
    }

    let hasDefaultVariant = false;
    const variantDocs = [];

    /* ---------------- CREATE VARIANTS ---------------- */
    for (const variant of variants) {
      if (!variant.price) {
        throw new ApiError(400, "Variant price is required");
      }

      console.log(variant.salePrice);

      if (!variant.weight) {
        throw new ApiError(400, "Variant weight is required for shipping");
      }

      if (!variant.hsnCode) {
        throw new ApiError(400, "HSN code is required");
      }

      if (variant.isDefault) {
        hasDefaultVariant = true;
      }

      const variantDoc = await ProductVariant.create(
        [
          {
            productId: product._id,
            color: variant.color,
            size: variant.size,
            price: variant.price,
            salePrice: variant.salePrice,
            stockQuantity: variant.stockQuantity ?? 0,
            isDefault: variant.isDefault ?? false,
            isActive: variant.isActive ?? true,
            weight: variant.weight,
            dimensions: variant.dimensions,
            hsnCode: variant.hsnCode,
            taxRate: variant.taxRate ?? 0,
          },
        ],
        { session }
      );

      variantDocs.push(variantDoc[0]);
    }

    if (!hasDefaultVariant) {
      throw new ApiError(400, "One variant must be marked as default");
    }

    await session.commitTransaction();
    session.endSession();

    return { product, variants: variantDocs };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};
/* ---------------- UPLOAD IMAGES ---------------- */
export const uploadProductImagesService = async ({ productId, files }) => {
  // 1️⃣ Validate product
  const productExists = await Product.exists({ _id: productId });
  if (!productExists) {
    throw new ApiError(404, "Product not found");
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, "No images uploaded");
  }

  const imageDocs = [];

  for (const file of files) {
    // Upload to Cloudinary
    const cloudRes = await uploadBufferToCloudinary(
      file.buffer,
      `products/${productId}/${Date.now()}-${file.originalname}`
    );

    // 🟢 PRODUCT IMAGES
    if (file.fieldname === "productImages") {
      imageDocs.push({
        productId,
        imageUrl: cloudRes.secure_url,
        public_id: cloudRes.public_id,
        isPrimary: false,
      });
      continue;
    }

    // 🔵 VARIANT IMAGES
    const match = file.fieldname.match(/variantImages\[(.*)\]/);
    if (match) {
      const variantId = match[1];

      const validVariant = await ProductVariant.exists({
        _id: variantId,
        productId,
      });

      if (!validVariant) continue;

      imageDocs.push({
        productId,
        variantId,
        imageUrl: cloudRes.secure_url,
        public_id: cloudRes.public_id,
        isPrimary: false,
      });
    }
  }

  if (imageDocs.length === 0) {
    throw new ApiError(400, "No valid images to upload");
  }

  await ProductImage.insertMany(imageDocs);

  return {
    uploadedCount: imageDocs.length,
  };
};

/* ----------------- UPDATE PRODUCT ----------------- */
export const updateProductService = async ({
  productId,
  productData,
  variants = [],
  removeVariantIds = [],
  removeImageIds = [],
  files = [],
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Validate product
    const product = await Product.findById(productId).session(session);
    if (!product) throw new ApiError(404, "Product not found");

    // 2️⃣ Update product fields
    Object.assign(product, productData);
    await product.save({ session });

    // 3️⃣ Remove specified variants
    if (removeVariantIds.length > 0) {
      await ProductVariant.deleteMany({
        _id: { $in: removeVariantIds },
        productId,
      }).session(session);
      await ProductImage.deleteMany({
        variantId: { $in: removeVariantIds },
      }).session(session);
    }

    // 4️⃣ Remove specified images
    if (removeImageIds.length > 0) {
      const imagesToRemove = await ProductImage.find({
        _id: { $in: removeImageIds },
        productId,
      }).session(session);
      for (const img of imagesToRemove) {
        // Delete from Cloudinary
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
      await ProductImage.deleteMany({
        _id: { $in: removeImageIds },
        productId,
      }).session(session);
    }

    // 5️⃣ Upsert variants (existing or new)
    const variantDocs = [];
    for (const v of variants) {
      if (v.id) {
        const variant = await ProductVariant.findOne({
          _id: v.id,
          productId,
        }).session(session);
        if (!variant) continue;
        Object.assign(variant, v);
        await variant.save({ session });
        variantDocs.push(variant);
      } else {
        const newVariant = await ProductVariant.create([{ ...v, productId }], {
          session,
        });
        variantDocs.push(newVariant[0]);
      }
    }

    // 6️⃣ Upload new images
    const imageDocs = [];
    for (const file of files) {
      const cloudRes = await uploadBufferToCloudinary(
        file.buffer,
        `products/${productId}/${Date.now()}-${file.originalname}`
      );

      if (file.fieldname === "productImages") {
        imageDocs.push({
          productId,
          imageUrl: cloudRes.secure_url,
          public_id: cloudRes.public_id,
          isPrimary: false,
        });
        continue;
      }

      const match = file.fieldname.match(/variantImages\[(.*)\]/);
      if (match) {
        const variantId = match[1];
        const validVariant = await ProductVariant.exists({
          _id: variantId,
          productId,
        });
        if (!validVariant) continue;

        imageDocs.push({
          productId,
          variantId,
          imageUrl: cloudRes.secure_url,
          public_id: cloudRes.public_id,
          isPrimary: false,
        });
      }
    }

    if (imageDocs.length > 0) {
      await ProductImage.insertMany(imageDocs, { session });
    }

    // 7️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // 8️⃣ Return updated product + variants + images (Shiprocket-ready)
    const updatedProduct = await Product.aggregate([
      { $match: { _id: product._id } },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $lookup: {
          from: "productimages",
          localField: "_id",
          foreignField: "productId",
          as: "images",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $project: {
          id: "$_id",
          title: "$name",
          body_html: "$description",
          vendor: "$brand",
          product_type: { $arrayElemAt: ["$category.name", 0] },
          created_at: "$createdAt",
          updated_at: "$updatedAt",
          status: "$status",
          tags: {
            $reduce: {
              input: "$tags",
              initialValue: "",
              in: {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", ", ", "$$this"] },
                ],
              },
            },
          },
          image: {
            $map: {
              input: {
                $filter: {
                  input: "$images",
                  as: "img",
                  cond: { $eq: ["$$img.variantId", null] },
                },
              },
              as: "i",
              in: { src: "$$i.imageUrl" },
            },
          },
          variants: {
            $map: {
              input: "$variants",
              as: "v",
              in: {
                id: "$$v._id",
                title: { $concat: ["$$v.color", " / ", "$$v.size"] },
                price: { $toString: "$$v.price" },
                sku: "$$v.sku",
                quantity: "$$v.stockQuantity",
                created_at: "$$v.createdAt",
                updated_at: "$$v.updatedAt",
                option_values: { Color: "$$v.color", Size: "$$v.size" },
                images: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$images",
                        as: "img",
                        cond: { $eq: ["$$img.variantId", "$$v._id"] },
                      },
                    },
                    as: "vi",
                    in: { src: "$$vi.imageUrl" },
                  },
                },
                taxable: true,
                compare_at_price: null,
                grams: 0,
              },
            },
          },
          options: [
            { name: "Color", values: { $setUnion: ["$variants.color"] } },
            { name: "Size", values: { $setUnion: ["$variants.size"] } },
          ],
        },
      },
    ]);

    return {
      product: updatedProduct[0],
      uploadedImages: imageDocs.length,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

/* ----------------- GET ALL PRODUCTS ----------------- */
export const getProductsService = async ({
  page = 1,
  limit = 10,
  search = "",
}) => {
  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  // Base match query
  const matchQuery = { isDeleted: false };

  // 🔎 Full-text search
  if (search && search.trim() !== "") {
    matchQuery.$or = [
      { $text: { $search: search } }, // text search on name, description, tags
    ];
  }

  // Count total matching documents
  const total = await Product.countDocuments(matchQuery);

  // Aggregation pipeline
  const products = await Product.aggregate([
    { $match: matchQuery },

    /* ---------------- VARIANTS ---------------- */
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },

    // Optional: filter variants by SKU search if needed
    ...(search
      ? [
          {
            $addFields: {
              variants: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: {
                    $regexMatch: {
                      input: "$$v.sku",
                      regex: search,
                      options: "i",
                    },
                  },
                },
              },
            },
          },
        ]
      : []),

    /* ---------------- IMAGES ---------------- */
    {
      $lookup: {
        from: "productimages",
        localField: "_id",
        foreignField: "productId",
        as: "images",
      },
    },

    /* ---------------- CATEGORIES ---------------- */
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },

    /* ---------------- PROJECT OUTPUT ---------------- */
    {
      $project: {
        _id: 0,
        id: "$shiprocketProductId",
        title: "$name",
        body_html: "$description",
        vendor: "$brand",
        handle: "$handle",
        tags: "$tags",
        product_type: { $arrayElemAt: ["$category.name", 0] },
        created_at: "$createdAt",
        updated_at: "$updatedAt",
        status: "$status",

        /* ---------------- PRODUCT IMAGES ---------------- */
        image: {
          $let: {
            vars: {
              productImages: {
                $filter: {
                  input: "$images",
                  as: "img",
                  cond: { $eq: ["$$img.variantId", null] },
                },
              },
            },
            in: {
              $cond: [
                { $gt: [{ $size: "$$productImages" }, 0] },
                { src: { $arrayElemAt: ["$$productImages.imageUrl", 0] } },
                null,
              ],
            },
          },
        },

        /* ---------------- VARIANTS ---------------- */
        variants: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              id: "$$v.shiprocketVariantId",
              title: { $concat: ["$$v.color", " / ", "$$v.size"] },
              price: { $toString: "$$v.salePrice" },
              compare_at_price: { $toString: "$$v.price" },
              sku: "$$v.sku",
              quantity: "$$v.stockQuantity",
              created_at: "$$v.createdAt",
              updated_at: "$$v.updatedAt",
              taxable: true,
              grams: { $multiply: ["$$v.weight", 1000] },
              weight: "$$v.weight",
              weight_unit: "kg",
              option_values: { Color: "$$v.color", Size: "$$v.size" },

              /* -------- VARIANT IMAGES -------- */
              image: {
                $let: {
                  vars: {
                    variantImages: {
                      $filter: {
                        input: "$images",
                        as: "img",
                        cond: { $eq: ["$$img.variantId", "$$v._id"] },
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$variantImages" }, 0] },
                      {
                        src: { $arrayElemAt: ["$$variantImages.imageUrl", 0] },
                      },
                      null,
                    ],
                  },
                },
              },
            },
          },
        },

        /* ---------------- OPTIONS ---------------- */
        options: [
          { name: "Color", values: { $setUnion: ["$variants.color"] } },
          { name: "Size", values: { $setUnion: ["$variants.size"] } },
        ],
      },
    },

    { $sort: { createdAt: -1 } }, // newest first
    { $skip: skip },
    { $limit: limit },
  ]);

  const data = { total, products };

  return {
    data,
  };
};

/* ---------------- GET PRODUCT BY ID ---------------- */
export const getProductByIdService = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID");
  }

  const product = await Product.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(productId), isDeleted: false } },

    // Lookup variants
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },

    // Lookup images (product + variants)
    {
      $lookup: {
        from: "productimages",
        localField: "_id",
        foreignField: "productId",
        as: "images",
      },
    },

    // Lookup category name
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },

    // Project Shiprocket-ready format
    {
      $project: {
        id: "$shiprocketProductId",
        title: "$name",
        body_html: "$description",
        vendor: "$brand",
        product_type: { $arrayElemAt: ["$category.name", 0] },
        created_at: "$createdAt",
        updated_at: "$updatedAt",
        status: "$status",
        tags: {
          $reduce: {
            input: "$tags",
            initialValue: "",
            in: {
              $cond: [
                { $eq: ["$$value", ""] },
                "$$this",
                { $concat: ["$$value", ", ", "$$this"] },
              ],
            },
          },
        },
        image: {
          $map: {
            input: {
              $filter: {
                input: "$images",
                as: "img",
                cond: { $eq: ["$$img.variantId", null] },
              },
            },
            as: "i",
            in: { src: "$$i.imageUrl" },
          },
        },
        variants: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              id: "$$v._id",
              title: { $concat: ["$$v.color", " / ", "$$v.size"] },
              price: { $toString: "$$v.price" },
              sku: "$$v.sku",
              quantity: "$$v.stockQuantity",
              created_at: "$$v.createdAt",
              updated_at: "$$v.updatedAt",
              option_values: { Color: "$$v.color", Size: "$$v.size" },
              images: {
                $map: {
                  input: {
                    $filter: {
                      input: "$images",
                      as: "img",
                      cond: { $eq: ["$$img.variantId", "$$v._id"] },
                    },
                  },
                  as: "vi",
                  in: { src: "$$vi.imageUrl" },
                },
              },
              taxable: true,
              compare_at_price: null,
              grams: 0,
            },
          },
        },
        options: [
          { name: "Color", values: { $setUnion: ["$variants.color"] } },
          { name: "Size", values: { $setUnion: ["$variants.size"] } },
        ],
      },
    },
  ]);

  if (!product || product.length === 0) {
    throw new Error("Product not found");
  }

  return product[0];
};

/* ---------------- DELETE PRODUCT (soft delete) ---------------- */
export const deleteProductService = async ({
  productId,
  hardDelete = false,
}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, "Invalid product ID");
  }

  if (hardDelete) {
    await Product.findByIdAndDelete(productId);
    await ProductVariant.deleteMany({ productId });
    await ProductImage.deleteMany({ productId });
    return { message: "Product permanently deleted" };
  } else {
    const product = await Product.findByIdAndUpdate(
      productId,
      { isDeleted: true, isActive: false },
      { new: true }
    );
    if (!product) throw new ApiError(404, "Product not found");
    return { message: "Product soft deleted" };
  }
};

/* ---------------- FEATURED PRODUCTS ---------------- */
export const featuredProductsService = async (limit = 10) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true,
    isDeleted: false,
  })
    .populate({
      path: "defaultVariant",
    })
    .populate({
      path: "images",
      match: { variantId: null },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    id: p._id,
    title: p.name,
    image: p.images?.[0]?.imageUrl || null,
    price: p.defaultVariant?.price || 0,
    status: p.status,
  }));
};

/* ---------------- POPULAR PRODUCTS ---------------- */
export const popularProductsService = async (limit = 10) => {
  // For demo: popular = most recently created active products
  const products = await Product.find({ isActive: true, isDeleted: false })
    .populate({
      path: "defaultVariant",
    })
    .populate({
      path: "images",
      match: { variantId: null },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return products.map((p) => ({
    id: p._id,
    title: p.name,
    image: p.images?.[0]?.imageUrl || null,
    price: p.defaultVariant?.price || 0,
    status: p.status,
  }));
};
