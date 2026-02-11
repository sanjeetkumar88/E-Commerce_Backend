import * as productService from "../services/product.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/* ---------------- CREATE PRODUCT + VARIANTS ---------------- */

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      shortDescription,
      craftmenshipDetails,
      luxeMaterials,
      productSpecifications,
      capacityAndDimensions,
      stylingInspiration,
      occasionsAndUsage,
      careGuide,
      categoryId,
      brand,
      tags,
      isFeatured,
      isActive,
      status,
      variants,
    } = req.body;

    if (!name || !categoryId) {
      throw new ApiError(400, "Product name and category are required");
    }
    let handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const variantList = Array.isArray(variants) ? variants : [];

    const result = await productService.createProductService({
      productData: {
        name,
        description,
        shortDescription,
        craftmenshipDetails,
        luxeMaterials,
        productSpecifications,
        capacityAndDimensions,
        stylingInspiration,
        occasionsAndUsage,
        careGuide,
        categoryId, 
        brand,
        tags,
        handle,
        isFeatured: isFeatured ?? false,
        isActive: isActive ?? true,
        status: status ?? "draft",
      },
      variants: variantList,
    });

    return res
      .status(201)
      .json(new ApiResponse(true, "Product created successfully", result));
  } catch (err) {
    console.error(err);
    next(new ApiError(err.statusCode || 500, err.message));
  }
};

/* ---------------- UPLOAD IMAGES ---------------- */
export const uploadProductImages = async (req, res, next) => {
  try {
    const { productId} = req.params;

    const result = await productService.uploadProductImagesService({
      productId,
      files: req.files,
    });

    return res
      .status(201)
      .json(new ApiResponse(true, "Images uploaded successfully", result));
  } catch (error) {
    next(error); // 🔥 central error handler
  }
};

/* ---------------- UPDATE PRODUCT + VARIANTS ---------------- */
export const updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const {
      name,
      description,
      shortDescription,
      categoryId,
      brand,
      tags,
      isFeatured,
      isActive,
      variants,
      removeVariantIds,
      removeImageIds
    } = req.body;

    const result = await productService.updateProductService({
      productId,
      productData: { name, description, shortDescription, categoryId, brand, tags, isFeatured, isActive },
      variants,
      removeVariantIds,
      removeImageIds,
      files: req.files
    });

    return res.status(200).json(new ApiResponse(true, "Product updated successfully", result));
  } catch (err) {
    next(err);
  }
};

/* ---------------- GET PRODUCTS ---------------- */
export const getProductsShipRocket = async (req, res, next) => {
  try {
    const result = await productService.getProductsShipRocketService(req.query);
    
    return res
      .status(200)
      .json(result);
  } catch (err) {
    next(err);
  }
};

/* ---------------- GET PRODUCTS (GENERAL) ---------------- */
export const getProducts = async (req, res, next) => {
  try {
    const { colors, sizes, sort, page, limit, search } = req.query;

    const result = await productService.getProductListService({
      page,
      limit,
      search,
      sort,
      // Convert "red,blue" string to ["red", "blue"]
      colors: colors ? colors.split(",") : [],
      sizes: sizes ? sizes.split(",") : []
    });

    res.status(200).json(new ApiResponse(200, result.data, "Products fetched"));
  } catch (error) {
    next(error);
  }
};

/* ---------------- GET PRODUCT BY ID ---------------- */
export const getProductDetail = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const product = await productService.getProductDetailService(identifier);

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product details fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/* ---------------- DELETE PRODUCT ---------------- */
export const deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const hardDelete = req.query.hard === "true";
    const result = await productService.deleteProductService({ productId, hardDelete });
    res.status(200).json(new ApiResponse(true, result.message, null));
  } catch (err) {
    next(err);
  }
};

/* ---------------- FEATURED PRODUCTS ---------------- */
export const featuredProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await productService.featuredProductsService(limit);
    res.status(200).json(new ApiResponse(true, "Featured products fetched", products));
  } catch (err) {
    next(err);
  }
};

/* ---------------- POPULAR PRODUCTS ---------------- */
export const popularProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const products = await productService.popularProductsService(limit);
    res.status(200).json(new ApiResponse(true, "Popular products fetched", products));
  } catch (err) {
    next(err);
  }
};
