import { ApiResponse } from "../utils/ApiResponse.js";
import * as categoryService from "../services/category.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { Category } from "../models/category.model.js";
import mongoose from "mongoose";


/* -------------------------------------------------------------------------- */
/*                           PRODUCTS BY CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const getProductsByCategoryShipRocket = async (req, res, next) => {
  try {

    
    const products = await categoryService.getProductsByCategory(
      { categoryId: req.params.categoryId,
        page: req.query.page,
        limit: req.query.limit
       }
    );

    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               CREATE CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const createCategory = async (req, res, next) => {
  try {
    const { name, parentId, description, isActive, sortOrder } = req.body;

    // 1. Validation check before expensive cloud operations
    if (!name) {
      throw new ApiError(400, "Category name is required");
    }

    let imageUrl = req.body.imageUrl;

    // 2. Handle File Upload with local error trapping
    if (req.file) {
      try {
        const result = await uploadBufferToCloudinary(
          req.file.buffer,
          `category-${Date.now()}`
        );
        imageUrl = result.secure_url;
      } catch (uploadError) {
        // Log the internal error for debugging, but tell the user why it failed
        console.error("Cloudinary Upload Error:", uploadError);
        throw new ApiError(500, "Image upload failed, please try again");
      }
    }

    // 3. Service Call with properly casted data
    const category = await categoryService.createCategoryService({
      name,
      description,
      parentId: parentId || null,
      imageUrl,
      // Cast form-data strings to correct types
      isActive: isActive === "string" ? isActive === "true" : Boolean(isActive ?? true),
      sortOrder: parseInt(sortOrder) || 0,
      metaTitle: req.body.metaTitle,
      metaDescription: req.body.metaDescription,
    });

    // 4. Consistent Success Response
    return res
      .status(201)
      .json(new ApiResponse(201, category, "Category created successfully"));

  } catch (error) {
    // 5. CRITICAL: Pass the error to the global handler
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Initial existence check
    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      throw new ApiError(404, "Category not found");
    }

    let imageUrl = req.body.imageUrl;

    // 2. Handle Image Update logic
    if (req.file) {
      // Upload new image to Cloudinary
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        `category-${Date.now()}`
      );
      imageUrl = result.secure_url;

    }

    // 3. Data Sanitization & Type Casting
    // Important: form-data fields arrive as strings
    const updateData = {
      ...req.body,
      ...(imageUrl && { imageUrl }),
      ...(req.body.isActive !== undefined && { 
        isActive: req.body.isActive === "true" || req.body.isActive === true 
      }),
      ...(req.body.sortOrder !== undefined && { 
        sortOrder: parseInt(req.body.sortOrder) || 0 
      }),
    };

    // 4. Update via Service
    const category = await categoryService.updateCategoryService(id, updateData);

    // 5. Standardized Success Response
    return res
      .status(200)
      .json(new ApiResponse(200, category, "Category updated successfully"));

  } catch (error) {
    // 6. Pass all errors to the global error middleware
    next(error);
  }
};

/* -------------------- GET ALL -------------------- */
export const getAllCategories = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const result = await categoryService.getAllCategories({ page, limit });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/* -------------------- DELETE -------------------- */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 1. Validate MongoDB ID format before calling the service
    // This prevents Mongoose from throwing a 'CastError' deeper in the code
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid Category ID format");
    }

    // 2. Extract and Validate Strategy
    // We default to 'ORPHAN' to be safe, but allow 'CASCADE' via query params
    const strategy = req.query.strategy?.toUpperCase() || "ORPHAN";

    const allowedStrategies = ["ORPHAN", "CASCADE"];
    if (!allowedStrategies.includes(strategy)) {
      throw new ApiError(
        400, 
        "Invalid strategy. Use 'ORPHAN' (default) or 'CASCADE'."
      );
    }

    // 3. Call the Transactional Service
    const result = await categoryService.deleteCategory(id, strategy);

    // 4. Return Standard Success Response
    return res
      .status(200)
      .json(new ApiResponse(200, null, result.message));

  } catch (error) {
    // 5. Pass errors (like 404 from service or Transaction failures) to global handler
    next(error);
  }
};

/* -------------------- GET CATEGORY TREE -------------------- */
export const getCategoryTree = async (req, res, next) => {
  try {
    const tree = await categoryService.getCategoryTree();
    
    return res
      .status(200)
      .json(new ApiResponse(200, tree, "Category tree fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const getProductsByCategory = async (req, res, next) => {
  try {
    const { 
      page, 
      limit, 
      search, 
      sort, 
      colors, 
      sizes, 
      isFeatured, 
      categoryhandle, 
      categoryId 
    } = req.query;

   

    const result = await categoryService.getProductListByCategoryHandleService({
      page,
      limit,
      search,
      sort,
      // Convert "red,blue" -> ["red", "blue"]
      colors: colors ? colors.split(",") : [],
      sizes: sizes ? sizes.split(",") : [],
      isFeatured: isFeatured === "true",
      categoryhandle,
      categoryId
    });

    return res
      .status(200)
      .json(new ApiResponse(200, result.data, "Products fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get breadcrumbs for a specific category
 * @route   GET /api/v1/categories/:id/breadcrumbs
 */
export const getCategoryBreadcrumbs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const breadcrumbs = await categoryService.getCategoryBreadcrumbs(id);
    
    return res
      .status(200)
      .json(new ApiResponse(200, breadcrumbs, "Breadcrumbs fetched successfully"));
  } catch (error) {
    next(error);
  }
};
