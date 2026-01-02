import { Router } from "express";
import {
  createProduct,
  uploadProductImages,
  getProducts,
  updateProduct,
  getProductById,
  deleteProduct,
  popularProducts,
  featuredProducts
} from "../controllers/productController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import upload from "../middlewares/multerMiddleware.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                              PUBLIC ROUTES                                  */
/* -------------------------------------------------------------------------- */

// List & search products
router.route("/").get(getProducts);

// Get product by ID
router.route("/:productId").get(getProductById);

// Featured products
router.route("/featured").get(featuredProducts);

// Popular products
router.route("/popular").get(popularProducts);


/* -------------------------------------------------------------------------- */
/*                              ADMIN ROUTES                                   */
/* -------------------------------------------------------------------------- */

  // Create product
  router.route("/").post(
    verifyJWT,
    isAdmin, // handles multiple uploaded files
    createProduct
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
  router
    .route("/:productId/delete")
    .delete(verifyJWT, isAdmin, deleteProduct);

export default router;
