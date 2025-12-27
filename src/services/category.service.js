import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";

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
export const getAllCategories = async () => {
  return await Category.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: -1 });
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

/* -------------------------------------------------------------------------- */
/*                           PRODUCTS BY CATEGORY                                */
/* -------------------------------------------------------------------------- */

export const getProductsByCategory = async ({
  categoryId,
  page = 1,
  limit = 20,
}) => {
  if (!categoryId) throw new ApiError(400, "categoryId is required");

  const category = await Category.findById(categoryId).lean();
  if (!category) throw new ApiError(404, "Category not found");

  const skip = (page - 1) * limit;

  const filter = {
    categoryId,
    isActive: true,
    isDeleted: false,
  };

  const products = await Product.find(filter)
    .populate("categoryId", "name slug")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const total = await Product.countDocuments(filter);

  return {
    data: products.map(p => ({
      ...p,
      categoryName: p.categoryId?.name || null,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};


// Category tree endpoint (parent → children)



