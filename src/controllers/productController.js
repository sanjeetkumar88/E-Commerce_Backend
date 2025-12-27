import * as productService from "../services/product.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/* -------------------------------------------------------------------------- */
/*                               CREATE PRODUCT (ADMIN)                        */
/* -------------------------------------------------------------------------- */
export const createProduct = async (req, res, next) => {
  try {
    // Pass both body and uploaded files to the service
   
    const product = await productService.createProduct(req.body, req.files);


    res
      .status(201)
      .json(new ApiResponse(201, product, "Product created successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               GET PRODUCT BY ID                             */
/* -------------------------------------------------------------------------- */
export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    res.status(200).json(new ApiResponse(200, product));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                          LIST / SEARCH PRODUCTS                              */
/* -------------------------------------------------------------------------- */
export const getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    res.status(200).json(new ApiResponse(200, result));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE PRODUCT (ADMIN)                        */
/* -------------------------------------------------------------------------- */
export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(
      req.params.productId,
      req.body
    );

    res
      .status(200)
      .json(new ApiResponse(200, product, "Product updated successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               DELETE PRODUCT (SOFT)                         */
/* -------------------------------------------------------------------------- */
export const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.productId);
    res
      .status(200)
      .json(new ApiResponse(200, null, "Product deleted successfully"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                            UPDATE PRODUCT STOCK (ADMIN)                     */
/* -------------------------------------------------------------------------- */
export const updateProductStock = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    const product = await productService.updateProductStock(
      req.params.productId,
      quantity
    );

    res
      .status(200)
      .json(new ApiResponse(200, product, "Stock updated"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                           UPDATE PRODUCT PRICE (ADMIN)                      */
/* -------------------------------------------------------------------------- */
export const updateProductPrice = async (req, res, next) => {
  try {
    const { price, discountedPrice } = req.body;

    const product = await productService.updateProductPrice(
      req.params.productId,
      price,
      discountedPrice
    );

    res
      .status(200)
      .json(new ApiResponse(200, product, "Price updated"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                           FEATURED PRODUCTS                                 */
/* -------------------------------------------------------------------------- */
export const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await productService.getFeaturedProducts(
      Number(req.query.limit) || 10
    );
    res.status(200).json(new ApiResponse(200, products));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                           POPULAR PRODUCTS                                  */
/* -------------------------------------------------------------------------- */
export const getPopularProducts = async (req, res, next) => {
  try {
    const products = await productService.getPopularProducts();
    res.status(200).json(new ApiResponse(200, products));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                           NEW ARRIVALS                                      */
/* -------------------------------------------------------------------------- */
export const getNewArrivals = async (req, res, next) => {
  try {
    const products = await productService.getNewArrivals();
    res.status(200).json(new ApiResponse(200, products));
  } catch (error) {
    next(error);
  }
};




