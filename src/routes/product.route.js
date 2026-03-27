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
router.route("/sync").get(getProductsShipRocket);

// List & search products
// - Search (?search=...)
// - Sorting (?sort=priceLow)
// - Filtering (?colors=red,blue&sizes=XL)
// - Pagination (?page=2&limit=12)
// - isFeatured (?isFeatured=true)
// - newest (?sort=newest)

router.route("/").get(getProducts);

router.route("/admin").get(verifyJWT, isAdmin, getProductsAdmin);



// Get product by ID
router.route("/:identifier").get(getProductDetail);

/* -------------------------------------------------------------------------- */
/*                              ADMIN ROUTES                                   */
/* -------------------------------------------------------------------------- */

// Get product detail for admin (includes inactive variants)
router.route("/admin/:identifier").get(verifyJWT, isAdmin, getProductDetailAdmin);

// Create product (accepts FormData with images)
router.route("/").post(
  verifyJWT,
  isAdmin,
  upload.any(),
  createProduct,
);



// Upload product images
router
  .route("/:productId/images")
  .post(verifyJWT, isAdmin, upload.any(), uploadProductImages);

// Update product & variants
router
  .route("/:productId/update")
  .put(verifyJWT, isAdmin, upload.any(), updateProduct);

// Delete product
router.route("/:productId/delete").delete(verifyJWT, isAdmin, deleteProduct);

export default router;
