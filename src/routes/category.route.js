import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getProductsByCategory,
  getCategoryBreadcrumbs,
  getCategoryTree,
  getProductsByCategoryShipRocket,
} from "../controllers/categoryController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import upload from "../middlewares/multerMiddleware.js";

const router = Router();

/* -------------------- GET ALL CATEGORIES -------------------- */
router.route("/").get(getAllCategories);

router
  .route("/createcategory")
  .post(verifyJWT, isAdmin, upload.single("image"), createCategory);

/* -------------------- UPDATE CATEGORY -------------------- */
router
  .route("/updatecategory/:id")
  .put(verifyJWT, isAdmin, upload.single("image"), updateCategory);

/* -------------------- DELETE CATEGORY -------------------- */
router
  .route("/deletecategory/:id")
  .delete(verifyJWT, isAdmin, deleteCategory);

/*----------------------PRODUCTS BY CATEGORY------------------*/
// /api/products/category?categoryhandle=decor
// /api/products/category?categoryhandle=decor&page=1&limit=12
// /api/products/category?categoryhandle=decor&colors=red,blue
// /api/products/category?categoryhandle=decor&sizes=M,L
// /api/products/category?categoryhandle=decor&sort=price_asc
router.route("/products").get(getProductsByCategory);

router.route("/sync/:categoryId").get(getProductsByCategoryShipRocket);

/*----------------------CATEGORY BREADCRUMBS------------------*/
router.route("/:id/breadcrumbs").get(getCategoryBreadcrumbs);

/*----------------------CATEGORY TREE------------------*/
router.route("/tree").get(verifyJWT, isAdmin, getCategoryTree);

export default router;
