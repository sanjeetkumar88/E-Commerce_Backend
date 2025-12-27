import { Router } from "express";
import {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  updateProductStock,
  updateProductPrice,
  getFeaturedProducts,
  getPopularProducts,
  getNewArrivals,
} from "../controllers/productController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import  upload  from "../middlewares/multerMiddleware.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                              PUBLIC ROUTES                                  */
/* -------------------------------------------------------------------------- */

// List & search products
router.route("/").get(getAllProducts);

// Featured / Popular / New arrivals
router.route("/featured").get(getFeaturedProducts);

router.route("/popular").get(getPopularProducts);

router.route("/new-arrivals").get(getNewArrivals);


// Single product
router.route("/:productId").get(getProductById);

/* -------------------------------------------------------------------------- */
/*                              ADMIN ROUTES                                   */
/* -------------------------------------------------------------------------- */

// Create product
router.route("/").post(
  verifyJWT,
  isAdmin,
  upload.any(), // handles multiple uploaded files
  createProduct
);

// Update product
router
  .route("/:productId")
  .patch(verifyJWT, isAdmin, updateProduct)
  .delete(verifyJWT, isAdmin, deleteProduct);

// Stock management
router.route("/:productId/stock").patch(verifyJWT, isAdmin, updateProductStock);

// Price management
router.route("/:productId/price").patch(verifyJWT, isAdmin, updateProductPrice);

export default router;
