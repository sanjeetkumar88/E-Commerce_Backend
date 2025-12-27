import { ApiResponse } from "../utils/ApiResponse.js";
import * as categoryService from "../services/category.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";


/* -------------------------------------------------------------------------- */
/*                           PRODUCTS BY CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const getProductsByCategory = async (req, res, next) => {
  try {

    
    const products = await categoryService.getProductsByCategory(
      { categoryId: req.params.categoryId,
        page: req.query.page,
        limit: req.query.limit
       }
    );

    res.status(200).json(new ApiResponse(200, products));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               CREATE CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const createCategory = async (req, res, next) => {
  try {
    let imageUrl;

    // Upload image if provided
    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        `category-${Date.now()}`
      );
      imageUrl = result.secure_url;
    }

    const category = await categoryService.createCategoryService({
      ...req.body,
      imageUrl,
    });

    res
      .status(201)
      .json(new ApiResponse(201, category, "Category created successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE CATEGORY                               */
/* -------------------------------------------------------------------------- */
export const updateCategory = async (req, res, next) => {
  try {
    let imageUrl;

    if (req.file) {
      const result = await uploadBufferToCloudinary(
        req.file.buffer,
        `category-${Date.now()}`
      );
      imageUrl = result.secure_url;
    }

    const category = await categoryService.updateCategoryService(req.params.id, {
      ...req.body,
      ...(imageUrl && { imageUrl }),
    });

    res
      .status(200)
      .json(new ApiResponse(200, category, "Category updated successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------- GET ALL -------------------- */
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    res
      .status(200)
      .json(new ApiResponse(200, categories, "Categories fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------- GET BY ID -------------------- */
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res
      .status(200)
      .json(new ApiResponse(200, category, "Category fetched successfully"));
  } catch (error) {
    next(error);
  }
};


/* -------------------- DELETE -------------------- */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    res
      .status(200)
      .json(new ApiResponse(200, category, "Category deleted successfully"));
  } catch (error) {
    next(error);
  }
};
