import { Router } from "express";
import {
  createProduct,
  uploadProductImages,
  getProductsShipRocket,
  updateProduct,
  deleteProduct,
  popularProducts,
  featuredProducts,
  getProducts,
  getProductDetail,
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



// Get product by ID
router.route("/:identifier").get(getProductDetail);

/* -------------------------------------------------------------------------- */
/*                              ADMIN ROUTES                                   */
/* -------------------------------------------------------------------------- */

// Create product
router.route("/").post(
  verifyJWT,
  isAdmin,
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
