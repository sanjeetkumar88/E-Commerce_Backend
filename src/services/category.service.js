import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

/* -------------------- CREATE CATEGORY -------------------- */
export const createCategoryService = async (data) => {
  const {
    name,
    slug,
    description,
    parentId,
    imageUrl,
    isActive,
    sortOrder,
    metaTitle,
    metaDescription,
  } = data;

  // Check duplicate slug
  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new ApiError(409, "Category with this slug already exists");
  }

  const category = await Category.create({
    name,
    slug,
    description,
    parentId: parentId || null,
    imageUrl,
    isActive,
    sortOrder,
    metaTitle,
    metaDescription,
  });

  return category;
};

/* -------------------- GET ALL CATEGORIES -------------------- */
export const getAllCategories = async ({page = 1, limit = 100}) => {

  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;
  const total = await Category.countDocuments({ isActive: true });
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).skip(skip).limit(limit);

  // Map to Shiprocket / Shopify collection format
  const collections = categories.map(cat => ({
    id: cat._id,
    title: cat.name,
    body_html: cat.description || "",
    handle: cat.slug,
    image: cat.imageUrl ? { src: cat.imageUrl } : null,
    created_at: cat.createdAt,
    updated_at: cat.updatedAt
  }));

  return {
    total,
    collections
  };
};

/* -------------------- GET CATEGORY BY ID -------------------- */
export const getCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }
  return category;
};

/* -------------------- UPDATE CATEGORY -------------------- */
export const updateCategoryService = async (categoryId, data) => {
  const allowedFields = [
    "name",
    "slug",
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

  // If slug is updated → ensure uniqueness
  if (filteredData.slug) {
    const exists = await Category.findOne({
      slug: filteredData.slug,
      _id: { $ne: categoryId },
    });

    if (exists) {
      throw new ApiError(409, "Slug already in use");
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    categoryId,
    filteredData,
    { new: true, runValidators: true }
  );

  if (!updatedCategory) {
    throw new ApiError(404, "Category not found");
  }

  return updatedCategory;
};

/* -------------------- DELETE (SOFT) CATEGORY -------------------- */
export const deleteCategory = async (id) => {
  const category = await Category.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  return category;
};

/* ---------------- GET PRODUCTS BY CATEGORY ---------------- */

export const getProductsByCategory = async ({ categoryId, search = "", page = 1, limit = 100 }) => {
  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const matchQuery = { categoryId: new mongoose.Types.ObjectId(categoryId), isDeleted: false };

  // 🔎 Add search
  if (search && search.trim() !== "") {
    const regex = new RegExp(search.trim(), "i"); // case-insensitive
    matchQuery.$or = [
      { name: regex },
      { description: regex },
      { tags: regex }
    ];
  }

  const total = await Product.countDocuments(matchQuery);

  const products = await Product.aggregate([
    { $match: matchQuery },

    // Lookup variants
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants"
      }
    },

    // Lookup images
    {
      $lookup: {
        from: "productimages",
        localField: "_id",
        foreignField: "productId",
        as: "images"
      }
    },

    // Lookup category
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category"
      }
    },

    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },

    {
      $project: {
        id: "$_id",
        title: "$name",
        body_html: "$description",
        vendor: "$brand",
        product_type: { $arrayElemAt: ["$category.name", 0] },
        created_at: "$createdAt",
        updated_at: "$updatedAt",
        handle: "$slug",
        tags: { $reduce: { input: "$tags", initialValue: "", in: { $cond: [{ $eq: ["$$value", ""] }, "$$this", { $concat: ["$$value", ", ", "$$this"] }] } } },
        status: "$status",
        images: { $map: { input: { $filter: { input: "$images", as: "img", cond: { $eq: ["$$img.variantId", null] } } }, as: "i", in: { src: "$$i.imageUrl" } } },
        variants: { $map: { input: "$variants", as: "v", in: { id: "$$v._id", title: { $concat: ["$$v.color", " / ", "$$v.size"] }, price: { $toString: "$$v.price" }, compare_at_price: null, sku: "$$v.sku", created_at: "$$v.createdAt", updated_at: "$$v.updatedAt", taxable: true, quantity: "$$v.stockQuantity", grams: 0, weight: 0, weight_unit: "lb", option_values: { Color: "$$v.color", Size: "$$v.size" }, images: { $map: { input: { $filter: { input: "$images", as: "img", cond: { $eq: ["$$img.variantId", "$$v._id"] } } }, as: "vi", in: { src: "$$vi.imageUrl" } } } } } },
        options: [
          { name: "Color", values: { $setUnion: ["$variants.color"] } },
          { name: "Size", values: { $setUnion: ["$variants.size"] } }
        ]
      }
    }
  ]);

  products.forEach(prod => {
    prod.image = prod.images.length > 0 ? { src: prod.images[0].src } : null;
    delete prod.images;
  });

  return { total, products };
};








