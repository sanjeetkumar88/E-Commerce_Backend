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
      isFeatured,
      isActive,
      status,
    } = req.body;

    if (!name || !categoryId) {
      throw new ApiError(400, "Product name and category are required");
    }

    // Parse JSON strings from FormData
    let variants = [];
    try {
      variants = typeof req.body.variants === "string"
        ? JSON.parse(req.body.variants)
        : Array.isArray(req.body.variants) ? req.body.variants : [];
    } catch (_) { variants = []; }

    let tags = [];
    try {
      if (typeof req.body.tags === "string" && req.body.tags.trim()) {
        // Could be JSON array or comma-separated
        if (req.body.tags.startsWith("[")) {
          tags = JSON.parse(req.body.tags);
        } else {
          tags = req.body.tags.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    } catch (_) {
      tags = req.body.tags ? req.body.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    }

    const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let productImagesUrls = [];
    if (req.body.productImages) {
      productImagesUrls = Array.isArray(req.body.productImages) 
        ? req.body.productImages 
        : [req.body.productImages];
    }

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
        isFeatured: isFeatured === true || isFeatured === "true",
        isActive: isActive === undefined || isActive === true || isActive === "true",
        status: status || "draft",
      },
      variants,
      productImagesUrls,
    });

    // Upload images if files were sent along with the create request
    if (req.files && req.files.length > 0) {
      // Remap variantImages[index] → variantImages[actualVariantId]
      const createdVariantIds = result.variants.map(v => String(v._id));
      const remappedFiles = req.files.map(file => {
        const indexMatch = file.fieldname.match(/^variantImages\[(\d+)\]$/);
        if (indexMatch) {
          const idx = parseInt(indexMatch[1], 10);
          if (createdVariantIds[idx]) {
            return { ...file, fieldname: `variantImages[${createdVariantIds[idx]}]` };
          }
        }
        return file;
      });

      await productService.uploadProductImagesService({
        productId: result.product._id,
        files: remappedFiles,
      });
    }

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
      craftmenshipDetails,
      luxeMaterials,
      productSpecifications,
      capacityAndDimensions,
      stylingInspiration,
      occasionsAndUsage,
      careGuide,
      categoryId,
      brand,
      isFeatured,
      isActive,
      status,
    } = req.body;

    // Parse JSON strings from FormData
    let variants = [];
    try {
      variants = typeof req.body.variants === "string"
        ? JSON.parse(req.body.variants)
        : Array.isArray(req.body.variants) ? req.body.variants : [];
    } catch (_) { variants = []; }

    let tags = [];
    try {
      if (typeof req.body.tags === "string" && req.body.tags.trim()) {
        if (req.body.tags.startsWith("[")) {
          tags = JSON.parse(req.body.tags);
        } else {
          tags = req.body.tags.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    } catch (_) {
      tags = req.body.tags ? req.body.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    }

    let removeVariantIds = [];
    try {
      removeVariantIds = typeof req.body.removeVariantIds === "string"
        ? JSON.parse(req.body.removeVariantIds)
        : Array.isArray(req.body.removeVariantIds) ? req.body.removeVariantIds : [];
    } catch (_) { removeVariantIds = []; }

    let removeImageIds = [];
    try {
      removeImageIds = typeof req.body.removeImageIds === "string"
        ? JSON.parse(req.body.removeImageIds)
        : Array.isArray(req.body.removeImageIds) ? req.body.removeImageIds : [];
    } catch (_) { removeImageIds = []; }

    let productImagesUrls = [];
    if (req.body.productImages) {
      productImagesUrls = Array.isArray(req.body.productImages) 
        ? req.body.productImages 
        : [req.body.productImages];
    }

    const result = await productService.updateProductService({
      productId,
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
        isFeatured: isFeatured === true || isFeatured === "true",
        isActive: isActive === undefined || isActive === true || isActive === "true",
        status: status || undefined,
      },
      variants,
      removeVariantIds,
      removeImageIds,
      files: req.files || [],
      productImagesUrls,
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
    const { colors, sizes, sort, page, limit, search,isFeatured} = req.query;

    const result = await productService.getProductListService({
      page,
      limit,
      search,
      sort,
      isFeatured: isFeatured === "true",
      // Convert "red,blue" string to ["red", "blue"]
      colors: colors ? colors.split(",") : [],
      sizes: sizes ? sizes.split(",") : []
    });

    res.status(200).json(new ApiResponse(200, result.data, "Products fetched"));
  } catch (error) {
    next(error);
  }
};

export const getProductsAdmin = async (req, res, next) => {
  try {
    const { colors, sizes, sort, page, limit, search,isFeatured } = req.query;

    const result = await productService.getProductListServiceAdmin({
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

/* ---------------- GET PRODUCT BY ID (ADMIN) ---------------- */
export const getProductDetailAdmin = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const product = await productService.getProductDetailAdminService(identifier);

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Admin Product details fetched successfully"));
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


