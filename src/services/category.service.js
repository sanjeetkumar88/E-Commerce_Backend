import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

/* -------------------- CREATE CATEGORY -------------------- */
export const createCategoryService = async (data) => {
  try {
    const category = await Category.create(data);
    return category;
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];

      throw new ApiError(
        409,
        `A category with this ${duplicateField} already exists.`,
      );
    }
    throw error;
  }
};

/* -------------------- GET ALL CATEGORIES -------------------- */
export const getAllCategories = async ({ page = 1, limit = 100 }) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.max(1, Math.min(parseInt(limit) || 100, 250));
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  const [total, categories] = await Promise.all([
    Category.countDocuments({ isActive: true }),
    Category.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(sanitizedLimit)
      .lean()
  ]);

  const collections = categories.map((cat) => ({
    id: cat.shiprocketCategoryId,
    title: cat.name,
    body_html: cat.description || "",
    handle: cat.handle || cat.name?.toLowerCase().replace(/\s+/g, "-"),
    ...(cat.imageUrl && { image: { src: cat.imageUrl } }),
    parentId: cat.parentId,
    created_at: cat.createdAt?.toISOString(),
    updated_at: cat.updatedAt?.toISOString(),
  }));

  return {
    data: {
      total,
      collections,
    },
  };
};


/* -------------------- UPDATE CATEGORY -------------------- */
export const updateCategoryService = async (categoryId, data) => {
  const allowedFields = [
    "name",
    "handle",
    "description",
    "parentId",
    "imageUrl",
    "isActive",
    "sortOrder",
    "metaTitle",
    "metaDescription",
  ];

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(([key]) => allowedFields.includes(key))
  );

  if (Object.keys(filteredData).length === 0) {
    throw new ApiError(400, "No valid fields provided for update.");
  }

  if (filteredData.name && !filteredData.handle) {
    filteredData.handle = filteredData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  if (filteredData.parentId?.toString() === categoryId.toString()) {
    throw new ApiError(400, "Category cannot be its own parent.");
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      filteredData,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      throw new ApiError(404, "Category not found");
    }

    return updatedCategory;

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new ApiError(409, `The ${field} is already in use by another category.`);
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      throw new ApiError(400, messages.join(", "));
    }

    throw error;
  }
};



/**
 * @param {string} categoryId - The ID of the category to delete
 * @param {string} strategy - 'CASCADE' or 'ORPHAN' (defaults to ORPHAN)
 */

export const deleteCategory = async (
  categoryId,
  strategy = "ORPHAN",
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const category = await Category.findById(categoryId).session(session);
    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    if (strategy === "CASCADE") {
      // 1. Find all descendant IDs (Recursive)
      const allDescendantIds = await getAllDescendantIds(categoryId);
      const idsToDelete = [categoryId, ...allDescendantIds];

      // 2. Delete all categories in the hierarchy
      await Category.deleteMany({ _id: { $in: idsToDelete } }).session(session);

      // 3. Handle Products: You can either delete them or mark them as "Uncategorized"
      await Product.updateMany(
        { categoryId: { $in: idsToDelete } },
        { $set: { categoryId: null, isActive: false } },
      ).session(session);
    } else {
      // ORPHAN Strategy (Default)
      // 1. Move children to root
      await Category.updateMany(
        { parentId: categoryId },
        { $set: { parentId: null } },
      ).session(session);

      // 2. Clear product category associations
      await Product.updateMany(
        { categoryId: categoryId },
        { $set: { categoryId: null } },
      ).session(session);

      // 3. Delete the target category
      await Category.findByIdAndDelete(categoryId).session(session);
    }

    await session.commitTransaction();
    return {
      message: `Category deleted successfully using ${strategy} strategy`,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Helper to find all nested children IDs
 */
async function getAllDescendantIds(parentId) {
  let descendants = [];
  const children = await Category.find({ parentId }).select("_id");

  for (const child of children) {
    descendants.push(child._id);
    const nested = await getAllDescendantIds(child._id);
    descendants.push(...nested);
  }
  return descendants;
}

/* ---------------- GET PRODUCTS BY CATEGORY ---------------- */

export const getProductsByCategory = async ({
  categoryId,
  search = "",
  page = 1,
  limit = 100,
}) => {
  // 1. Sanitize pagination inputs
  const sanitizedPage = Math.max(1, parseInt(page));
  const sanitizedLimit = Math.max(1, parseInt(limit));
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  // 2. Build the Match Query
  const matchQuery = {
    categoryId: new mongoose.Types.ObjectId(categoryId),
    isDeleted: false,
  };

  // Add Case-Insensitive Search
  if (search && search.trim() !== "") {
    const regex = new RegExp(search.trim(), "i");
    matchQuery.$or = [
      { name: regex },
      { description: regex },
      { tags: regex },
      { brand: regex },
    ];
  }

  // 3. Get Total Count (Run in parallel with aggregate for better speed if needed)
  const total = await Product.countDocuments(matchQuery);

  // 4. Execute Optimized Aggregation
  const products = await Product.aggregate([
    { $match: matchQuery },
    { $sort: { createdAt: -1 } },

    { $skip: skip },
    { $limit: sanitizedLimit },

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
        _id: 0,
        id: "$shiprocketProductId",
        title: "$name",
        body_html: "$description",
        vendor: "$brand",
        product_type: { $arrayElemAt: ["$category.name", 0] },
        created_at: "$createdAt",
        updated_at: "$updatedAt",
        handle: "$handle",
        status: "$status",
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
        image: { src: { $arrayElemAt: ["$images.imageUrl", 0] } },

        // Format Variants
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
              weight: { $divide: ["$$v.weight", 1000] },
              grams: "$$v.weight",
              weight_unit: "kg",
              created_at: "$$v.createdAt",
              updated_at: "$$v.updatedAt",
              option_values: { Color: "$$v.color", Size: "$$v.size" },
              taxable: {
                $cond: {
                  if: { $gt: ["$$v.taxRate", 0] },
                  then: true,
                  else: false,
                },
              },
              // Find the first image associated with this specific variant
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

        options: [
          {
            name: "Color",
            values: {
              $setUnion: [
                {
                  $filter: {
                    input: "$variants.color",
                    as: "c",
                    cond: { $ne: ["$$c", null] },
                  },
                },
              ],
            },
          },
          {
            name: "Size",
            values: {
              $setUnion: [
                {
                  $filter: {
                    input: "$variants.size",
                    as: "s",
                    cond: { $ne: ["$$s", null] },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);

  return {
    data: {
      total,
      products: products,
    },
  };
};


export const getProductListByCategoryHandleService = async ({
  page = 1,
  limit = 12,
  search = "",
  sort = "newest",
  colors = [],
  sizes = [],
  isFeatured = false,
  categoryHandle = null,
  categoryId = null,
}) => {
  const sanitizedPage = Math.max(1, parseInt(page) || 1);
  const sanitizedLimit = Math.min(50, Math.max(1, parseInt(limit) || 12));
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  /* ---------------- CATEGORY FILTER ---------------- */

  let categoryMatch = {};

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    categoryMatch.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  /* ---------------- BASE MATCH ---------------- */

  const baseMatch = {
    isDeleted: false,
    status: "active",
    ...categoryMatch,
    ...(isFeatured && { isFeatured: true }),
  };

  if (search?.trim()) {
    baseMatch.$text = { $search: search.trim() };
  }

  /* ---------------- SORT ---------------- */

  let sortStage = { createdAt: -1 };
  if (sort === "priceLow") sortStage = { sortPrice: 1 };
  if (sort === "priceHigh") sortStage = { sortPrice: -1 };

  const pipeline = [

    /* 1️⃣ MATCH BASE */
    { $match: baseMatch },

    /* 2️⃣ IF categoryHandle IS PROVIDED → MATCH VIA LOOKUP */
    ...(categoryHandle
      ? [
          {
            $lookup: {
              from: "categories",
              localField: "categoryId",
              foreignField: "_id",
              as: "categoryData",
            },
          },
          {
            $match: {
              "categoryData.handle": categoryHandle,
            },
          },
        ]
      : []),

    /* 3️⃣ LOOKUP VARIANTS */
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
              sku: 1,
              stockQuantity: 1,
              isDefault: 1,
            },
          },
        ],
        as: "variants",
      },
    },

    /* 4️⃣ REMOVE PRODUCTS WITHOUT VARIANTS */
    { $match: { "variants.0": { $exists: true } } },

    /* 5️⃣ DEFAULT VARIANT */
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

    /* 6️⃣ SORT PRICE */
    {
      $addFields: {
        sortPrice: {
          $ifNull: ["$defaultVariant.salePrice", "$defaultVariant.price"],
        },
      },
    },

    /* 7️⃣ LOOKUP CATEGORY NAME (LIGHT) */
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        pipeline: [{ $project: { name: 1 } }],
        as: "category",
      },
    },

    /* 8️⃣ LOOKUP PRIMARY IMAGE */
    {
      $lookup: {
        from: "productimages",
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$productId", "$$pid"] },
                  { $eq: ["$isPrimary", true] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { imageUrl: 1 } },
        ],
        as: "primaryImage",
      },
    },

    /* 9️⃣ SORT */
    { $sort: sortStage },

    /* 🔟 FACET */
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


/* ---------------- GET CATEGORY TREE ---------------- */

export const getCategoryTree = async () => {
  // Fetch only active categories
  const categories = await Category.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .lean();

  const map = {};
  const tree = [];

  // Create a map of all categories
  categories.forEach((cat) => {
    map[cat._id] = { ...cat, children: [] };
  });

  // Build the tree
  categories.forEach((cat) => {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat._id]);
    } else {
      tree.push(map[cat._id]);
    }
  });

  return tree;
};

/* ---------------- GET CATEGORY BREADCRUMBS ---------------- */
export const getCategoryBreadcrumbs = async (categoryId) => {
  const breadcrumbs = [];
  let currentId = categoryId;

  while (currentId) {
    const category = await Category.findById(currentId)
      .select("name handle parentId")
      .lean();
    
    if (!category) break;

    breadcrumbs.unshift({
      name: category.name,
      handle: category.handle,
      id: category._id
    });

    currentId = category.parentId;
  }

  return breadcrumbs;
};



