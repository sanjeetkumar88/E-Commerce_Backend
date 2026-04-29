import { Router } from "express";
import {
  createProduct,
  uploadProductImages,
  getProductsShipRocket,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductDetail,
  getProductDetailAdmin,
  getProductsAdmin,
} from "../controllers/productController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import upload from "../middlewares/multerMiddleware.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                              PUBLIC ROUTES                                  */
/* -------------------------------------------------------------------------- */

// Sync products from ShipRocket
router.route("/sync").get((req, res, next) => {
    /*  #swagger.tags = ['Product']
        #swagger.summary = 'Sync products from ShipRocket'
    */
    getProductsShipRocket(req, res, next);
});

// List & search products
router.route("/").get((req, res, next) => {
    /*  #swagger.tags = ['Product']
        #swagger.summary = 'List & search products'
        #swagger.parameters['search'] = { in: 'query', description: 'Search term' }
        #swagger.parameters['sort'] = { in: 'query', description: 'Sort option (priceLow, priceHigh, newest, etc.)' }
        #swagger.parameters['colors'] = { in: 'query', description: 'Filter by colors (comma separated)' }
        #swagger.parameters['sizes'] = { in: 'query', description: 'Filter by sizes (comma separated)' }
        #swagger.parameters['page'] = { in: 'query', description: 'Page number' }
        #swagger.parameters['limit'] = { in: 'query', description: 'Items per page' }
        #swagger.parameters['isFeatured'] = { in: 'query', description: 'Filter by featured' }
    */
    getProducts(req, res, next);
});

router.route("/admin").get(verifyJWT, isAdmin, (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Get products for admin'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getProductsAdmin(req, res, next);
});

// Get product by ID
router.route("/:identifier").get((req, res, next) => {
    /*  #swagger.tags = ['Product']
        #swagger.summary = 'Get product by ID or Slug'
        #swagger.parameters['identifier'] = { description: 'Product ID or Slug' }
    */
    getProductDetail(req, res, next);
});

/* -------------------------------------------------------------------------- */
/*                              ADMIN ROUTES                                   */
/* -------------------------------------------------------------------------- */

// Get product detail for admin (includes inactive variants)
router.route("/admin/:identifier").get(verifyJWT, isAdmin, (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Get product detail for admin'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['identifier'] = { description: 'Product ID or Slug' }
    */
    getProductDetailAdmin(req, res, next);
});

// Create product (accepts FormData with images)
router.route("/").post(
  verifyJWT,
  isAdmin,
  upload.any(),
  (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Create product'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['images'] = {
            in: 'formData',
            type: 'file',
            description: 'Product images'
        }
    */
    createProduct(req, res, next);
  }
);

// Upload product images
router
  .route("/:productId/images")
  .post(verifyJWT, isAdmin, upload.any(), (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Upload product images'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['productId'] = { description: 'Product ID' }
    */
    uploadProductImages(req, res, next);
  });

// Update product & variants
router
  .route("/:productId/update")
  .put(verifyJWT, isAdmin, upload.any(), (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Update product & variants'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['productId'] = { description: 'Product ID' }
    */
    updateProduct(req, res, next);
  });

// Delete product
router.route("/:productId/delete").delete(verifyJWT, isAdmin, (req, res, next) => {
    /*  #swagger.tags = ['Product Admin']
        #swagger.summary = 'Delete product'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['productId'] = { description: 'Product ID' }
    */
    deleteProduct(req, res, next);
});

export default router;
