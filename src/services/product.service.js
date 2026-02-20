import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";
import { syncProductToShiprocket } from "./webhook.service.js";

/* ---------------- CREATE PRODUCT + VARIANTS ---------------- */

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
        { session },
      );

      variantDocs.push(variantDoc[0]);
    }

    if (!hasDefaultVariant) {
      throw new ApiError(400, "One variant must be marked as default");
    }

    await session.commitTransaction();
    session.endSession();

    // process.nextTick(async () => {
    //   try {
    //     const payload = await getShiprocketProductPayload(product._id);
    //     if (payload) {
    //       await syncProductToShiprocket(payload);
    //       console.log(payload)
    //       console.log("Product synced to Shiprocket in background");
    //     }
    //   } catch (error) {
    //     console.error("Error syncing product to Shiprocket:", error);
    //   }
    // });

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
      `products/${productId}/${Date.now()}-${file.originalname}`,
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
        `products/${productId}/${Date.now()}-${file.originalname}`,
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

/* ----------------- GET ALL PRODUCTS SHIPROCKET ----------------- */
export const getProductsShipRocketService = async ({
  page = 1,
  limit = 10,
  search = "",
}) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.max(1, parseInt(limit) || 10);
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  // Base match query
  const matchQuery = { isDeleted: false };

  // 🔎 Full-text search (Optimized for indexes)
  if (search && search.trim() !== "") {
    matchQuery.$or = [
      { name: new RegExp(search.trim(), "i") },
      { description: new RegExp(search.trim(), "i") },
      { tags: new RegExp(search.trim(), "i") },
    ];
  }

  // Execute Count and Aggregation in parallel for Production speed
  const [total, products] = await Promise.all([
    Product.countDocuments(matchQuery),
    Product.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: sanitizedLimit },

      /* ---------------- LOOKUPS ---------------- */
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

      /* ---------------- PROJECT OUTPUT (Unified Format) ---------------- */
      {
        $project: {
          _id: 0,
          id: "$shiprocketProductId",
          title: "$name",
          body_html: "$description",
          vendor: "$brand",
          product_type: { $arrayElemAt: ["$category.name", 0] },
          handle: "$handle",
          updated_at: "$updatedAt",
          tags: {
            $reduce: {
              input: { $ifNull: ["$tags", []] },
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
          status: "$status",
          created_at: "$createdAt",

          // Primary Image Mapping
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

          // Variants Mapping
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
                weight: { $divide: ["$$v.weight", 1000] }, // Convert grams to kg
                weight_unit: "kg",
                option_values: { Color: "$$v.color", Size: "$$v.size" },
                grams: "$$v.weight",
                taxable: { $cond: [{ $gt: ["$$v.taxRate", 0] }, true, false] },
                image: {
                  $let: {
                    vars: {
                      vImg: {
                        $filter: {
                          input: "$images",
                          as: "img",
                          cond: { $eq: ["$$img.variantId", "$$v._id"] },
                        },
                      },
                    },
                    in: {
                      $cond: [
                        { $gt: [{ $size: "$$vImg" }, 0] },
                        { src: { $arrayElemAt: ["$$vImg.imageUrl", 0] } },
                        null,
                      ],
                    },
                  },
                },
              },
            },
          },

          // Options Mapping
          options: [
            {
              name: "Color",
              values: {
                $filter: {
                  input: { $setUnion: ["$variants.color"] },
                  cond: { $ne: ["$$this", null] },
                },
              },
            },
            {
              name: "Size",
              values: {
                $filter: {
                  input: { $setUnion: ["$variants.size"] },
                  cond: { $ne: ["$$this", null] },
                },
              },
            },
          ],
        },
      },
    ]),
  ]);

  // Unified Output Format: matching getAllCategories
  return {
    data: {
      total,
      collections: products, // Renamed from products to collections for consistency
    },
  };
};

/* ----------------- GET PRODUCT LIST ----------------- */
export const getProductListService = async ({
  page = 1,
  limit = 12,
  search = "",
  sort = "newest", // newest | priceLow | priceHigh
  colors = [],
  sizes = [],
  isFeatured = false,
}) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.min(50, Math.max(1, parseInt(limit) || 12)); // cap limit for safety
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  // Base match (INDEXED)
  const baseMatch = {
    isDeleted: false,
    status: "active",
    ...(isFeatured && { isFeatured: true }),
  };

  if (search?.trim()) {
    baseMatch.$text = { $search: search.trim() };
  }

  // Sorting Logic
  let sortStage = { createdAt: -1 };
  if (sort === "priceLow") sortStage = { sortPrice: 1 };
  if (sort === "priceHigh") sortStage = { sortPrice: -1 };

  const pipeline = [
    /* 1️ MATCH BASE FILTER */
    { $match: baseMatch },

    /* 2️ LOOKUP FILTERED VARIANTS  */
    {
      $lookup: {
        from: "productvariants",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$pid"] },
              isActive: true,
              stockQuantity: { $gt: 0 },
              ...(colors.length > 0 && { color: { $in: colors } }),
              ...(sizes.length > 0 && { size: { $in: sizes } }),
            },
          },
          {
            $project: {
              price: 1,
              salePrice: 1,
              stockQuantity: 1,
              isDefault: 1,
            },
          },
        ],
        as: "variants",
      },
    },

    /* 3️ REMOVE PRODUCTS WITHOUT MATCHING VARIANTS */
    { $match: { "variants.0": { $exists: true } } },

    /* 4️ FIND DEFAULT VARIANT */
    {
      $addFields: {
        defaultVariant: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$variants",
                    as: "v",
                    cond: { $eq: ["$$v.isDefault", true] },
                  },
                },
                0,
              ],
            },
            { $arrayElemAt: ["$variants", 0] },
          ],
        },
      },
    },

    /* 5️ COMPUTE SAFE SORT PRICE */
    {
      $addFields: {
        sortPrice: {
          $ifNull: ["$defaultVariant.salePrice", "$defaultVariant.price"],
        },
      },
    },

    /* 6️ LOOKUP CATEGORY (Lightweight) */
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "category",
      },
    },

    /* 7️ LOOKUP PRIMARY IMAGE (ONLY 1) */
    {
      $lookup: {
        from: "productimages",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$productId", "$$pid"] }],
              },
            },
          },
          { $limit: 1 },
          { $project: { imageUrl: 1 } },
        ],
        as: "primaryImage",
      },
    },

    /* 8️ SORT */
    { $sort: sortStage },

    /* 9️ FACET (DATA + TOTAL COUNT) */
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: sanitizedLimit },
          {
            $project: {
              _id: 1,
              title: "$name",
              handle: 1,
              categoryName: { $arrayElemAt: ["$category.name", 0] },
              imageUrl: {
                $ifNull: [
                  { $arrayElemAt: ["$primaryImage.imageUrl", 0] },
                  "https://via.placeholder.com/500?text=No+Image",
                ],
              },
              price: "$defaultVariant.price",
              salePrice: "$defaultVariant.salePrice",
              sku: "$defaultVariant.sku",
              stockQuantity: "$defaultVariant.stockQuantity",
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    },
  ];

  const result = await Product.aggregate(pipeline).allowDiskUse(true);

  const products = result[0].data;
  const total = result[0].totalCount[0]?.count || 0;

  return {
    data: {
      total,
      page: sanitizedPage,
      totalPages: Math.ceil(total / sanitizedLimit),
      collections: products,
    },
  };
};

/* ---------------- GET PRODUCT DETAIL ----------------- */
export const getProductDetailService = async (identifier) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

  const matchQuery = isObjectId
    ? { _id: new mongoose.Types.ObjectId(identifier) }
    : { handle: identifier };

  const result = await Product.aggregate([
    {
      $match: {
        ...matchQuery,
        isDeleted: false,
        status: "active",
      },
    },

    /* ---------------- CATEGORY ---------------- */
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1, handle: 1 } }],
        as: "category",
      },
    },

    /* ---------------- ACTIVE VARIANTS ---------------- */
    {
      $lookup: {
        from: "productvariants",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$pid"] },
              isActive: true,
            },
          },
          {
            $project: {
              price: 1,
              salePrice: 1,
              color: 1,
              size: 1,
              sku: 1,
              stockQuantity: 1,
              isDefault: 1,
            },
          },
        ],
        as: "variants",
      },
    },

    /* ---------------- IMAGES ---------------- */
    {
      $lookup: {
        from: "productimages",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$productId", "$$pid"] },
              isPrimary: true,
            },
          },
          { $limit: 1 },
          { $project: { imageUrl: 1 } },
        ],
        as: "primaryImage",
      },
    },

    /* ---------------- DEFAULT VARIANT ---------------- */
    {
      $addFields: {
        defaultVariant: {
          $ifNull: [
            {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$variants",
                    as: "v",
                    cond: { $eq: ["$$v.isDefault", true] },
                  },
                },
                0,
              ],
            },
            { $arrayElemAt: ["$variants", 0] },
          ],
        },
      },
    },

    /* ---------------- RELATED PRODUCTS ---------------- */
    {
      $lookup: {
        from: "products",
        let: {
          currentId: "$_id",
          categoryId: "$categoryId",
          brand: "$brand",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $ne: ["$_id", "$$currentId"] },
                  { $eq: ["$categoryId", "$$categoryId"] },
                  { $eq: ["$status", "active"] },
                  { $eq: ["$isDeleted", false] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 6 },

          /* attach default variant price */
          {
            $lookup: {
              from: "productvariants",
              let: { pid: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$productId", "$$pid"] },
                    isDefault: true,
                  },
                },
                {
                  $project: {
                    price: 1,
                    salePrice: 1,
                  },
                },
                { $limit: 1 },
              ],
              as: "defaultVariant",
            },
          },

          {
            $lookup: {
              from: "productimages",
              let: { pid: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$productId", "$$pid"] },
                    isPrimary: true,
                  },
                },
                { $limit: 1 },
                { $project: { imageUrl: 1 } },
              ],
              as: "primaryImage",
            },
          },

          {
            $project: {
              _id: 1,
              name: 1,
              handle: 1,
              imageUrl: { $arrayElemAt: ["$primaryImage.imageUrl", 0] },
              price: { $arrayElemAt: ["$defaultVariant.price", 0] },
              salePrice: { $arrayElemAt: ["$defaultVariant.salePrice", 0] },
            },
          },
        ],
        as: "relatedProducts",
      },
    },

    /* ---------------- FINAL SHAPE ---------------- */
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        shortDescription: 1,
        craftmenshipDetails: 1,
        luxeMaterials: 1,
        productSpecifications: 1,
        capacityAndDimensions: 1,
        stylingInspiration: 1,
        occasionsAndUsage: 1,
        careGuide: 1,
        brand: 1,
        handle: 1,
        tags: 1,
        category: { $arrayElemAt: ["$category", 0] },
        galleryImage: { $arrayElemAt: ["$primaryImage.imageUrl", 0] },
        variants: 1,
        relatedProducts: 1,
      },
    },
  ]);

  if (!result.length) {
    throw new ApiError(404, "Product not found");
  }

  return result[0];
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
      { new: true },
    );
    if (!product) throw new ApiError(404, "Product not found");
    return { message: "Product soft deleted" };
  }
};

/* ---------------- SHIPROCKET PAYLOAD FORMATTER ---------------- */
export const getShiprocketProductPayload = async (productId) => {
  try {
    const result = await Product.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(productId),
          isDeleted: false,
        },
      },

      /* 1️⃣ Lookup Active Variants Only */
      {
        $lookup: {
          from: "productvariants",
          let: { pid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$pid"] },
                isActive: true,
              },
            },
          ],
          as: "variantsData",
        },
      },

      /* 2️⃣ Lookup All Images */
      {
        $lookup: {
          from: "productimages",
          localField: "_id",
          foreignField: "productId",
          as: "allImages",
        },
      },

      /* 3️⃣ Remove product if no active variants */
      { $match: { "variantsData.0": { $exists: true } } },

      /* 4️⃣ Format for Shiprocket */
      {
        $project: {
          _id: 0,

          id: "$shiprocketProductId",
          title: "$name",
          body_html: "$description",
          vendor: "$brand",
          product_type: "Cult Products",

          created_at: "$createdAt",
          updated_at: "$updatedAt",
          handle: "$handle",

          /* ✅ Status Mapping */
          status: {
            $cond: [{ $eq: ["$status", "active"] }, "active", "draft"],
          },

          /* Tags formatted as comma string */
          tags: {
            $reduce: {
              input: { $ifNull: ["$tags", []] },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  {
                    $cond: [{ $eq: ["$$value", ""] }, "", ", "],
                  },
                  "$$this",
                ],
              },
            },
          },

          /* Product Primary Image */
          image: {
            $let: {
              vars: {
                productImages: {
                  $filter: {
                    input: "$allImages",
                    as: "img",
                    cond: { $eq: ["$$img.variantId", null] },
                  },
                },
              },
              in: {
                src: { $arrayElemAt: ["$$productImages.imageUrl", 0] },
              },
            },
          },

          /* Variants */
          variants: {
            $map: {
              input: "$variantsData",
              as: "v",
              in: {
                id: "$$v.shiprocketVariantId",

                title: {
                  $trim: {
                    input: {
                      $concat: [
                        { $ifNull: ["$$v.color", ""] },
                        " ",
                        { $ifNull: ["$$v.size", ""] },
                      ],
                    },
                  },
                },

                /* ✅ Correct Price Logic */
                price: {
                  $toString: {
                    $ifNull: ["$$v.salePrice", "$$v.price"],
                  },
                },

                compare_at_price: {
                  $cond: [
                    {
                      $and: [
                        { $ifNull: ["$$v.salePrice", false] },
                        { $lt: ["$$v.salePrice", "$$v.price"] },
                      ],
                    },
                    { $toString: "$$v.price" },
                    null,
                  ],
                },

                sku: "$$v.sku",
                created_at: "$$v.createdAt",
                updated_at: "$$v.updatedAt",

                quantity: "$$v.stockQuantity",
                taxable: true,

                grams: { $ifNull: ["$$v.weight", 0] },

                /* ✅ Safe Weight Conversion */
                weight: {
                  $cond: [
                    { $ifNull: ["$$v.weight", false] },
                    { $divide: ["$$v.weight", 1000] },
                    0,
                  ],
                },

                weight_unit: "kg",

                option_values: {
                  Color: "$$v.color",
                  Size: "$$v.size",
                },

                /* Variant Specific Image */
                image: {
                  $let: {
                    vars: {
                      vImages: {
                        $filter: {
                          input: "$allImages",
                          as: "img",
                          cond: {
                            $eq: ["$$img.variantId", "$$v._id"],
                          },
                        },
                      },
                    },
                    in: {
                      src: {
                        $arrayElemAt: ["$$vImages.imageUrl", 0],
                      },
                    },
                  },
                },
              },
            },
          },

          /* Options summary */
          options: [
            {
              name: "Color",
              values: {
                $setUnion: ["$variantsData.color"],
              },
            },
            {
              name: "Size",
              values: {
                $setUnion: ["$variantsData.size"],
              },
            },
          ],
        },
      },
    ]);

    if (!result.length) return null;

    return result[0];
  } catch (error) {
    console.error("Shiprocket product formatting error:", error);
    throw error;
  }
};
