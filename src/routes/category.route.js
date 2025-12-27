import { Router } from "express";
import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getProductsByCategory,
} from "../controllers/categoryController.js";

import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import upload from "../middlewares/multerMiddleware.js";


const router = Router();

/* -------------------- GET ALL CATEGORIES -------------------- */
router.route("/").get(getAllCategories);

router.route("/createcategory").post(
  verifyJWT,
  isAdmin,
  upload.single("image"), // 👈 image field
  createCategory
);

router
  .route("/updatecategory/:id")
  .put(verifyJWT, isAdmin, upload.single("image"), updateCategory);

/* -------------------- DELETE CATEGORY -------------------- */
router.route("/deletecategory/:id").delete(verifyJWT, isAdmin, deleteCategory);

/*----------------------PRODUCTS BY CATEGORY------------------*/

router.route("/:categoryId").get(getProductsByCategory);

export default router;
