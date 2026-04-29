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
router.route("/").get((req, res, next) => {
    /*  #swagger.tags = ['Category']
        #swagger.summary = 'Get all categories'
    */
    getAllCategories(req, res, next);
});

router
  .route("/createcategory")
  .post(verifyJWT, isAdmin, upload.single("image"), (req, res, next) => {
    /*  #swagger.tags = ['Category Admin']
        #swagger.summary = 'Create a new category'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['image'] = {
            in: 'formData',
            type: 'file',
            description: 'Category image'
        }
    */
    createCategory(req, res, next);
  });

/* -------------------- UPDATE CATEGORY -------------------- */
router
  .route("/updatecategory/:id")
  .put(verifyJWT, isAdmin, upload.single("image"), (req, res, next) => {
    /*  #swagger.tags = ['Category Admin']
        #swagger.summary = 'Update category'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'Category ID' }
        #swagger.consumes = ['multipart/form-data']
        #swagger.parameters['image'] = {
            in: 'formData',
            type: 'file',
            description: 'Category image'
        }
    */
    updateCategory(req, res, next);
  });

/* -------------------- DELETE CATEGORY -------------------- */
router
  .route("/deletecategory/:id")
  .delete(verifyJWT, isAdmin, (req, res, next) => {
    /*  #swagger.tags = ['Category Admin']
        #swagger.summary = 'Delete category'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['id'] = { description: 'Category ID' }
    */
    deleteCategory(req, res, next);
  });

router.route("/tree").get((req, res, next) => {
    /*  #swagger.tags = ['Category']
        #swagger.summary = 'Get category tree structure'
    */
    getCategoryTree(req, res, next);
});

/*----------------------PRODUCTS BY CATEGORY------------------*/
router.route("/:categoryhandle").get((req, res, next) => {
    /*  #swagger.tags = ['Category']
        #swagger.summary = 'Get products by category handle'
        #swagger.parameters['categoryhandle'] = { description: 'Category handle/slug' }
        #swagger.parameters['page'] = { in: 'query', description: 'Page number' }
        #swagger.parameters['limit'] = { in: 'query', description: 'Items per page' }
        #swagger.parameters['colors'] = { in: 'query', description: 'Filter by colors' }
        #swagger.parameters['sizes'] = { in: 'query', description: 'Filter by sizes' }
        #swagger.parameters['sort'] = { in: 'query', description: 'Sort option' }
    */
    getProductsByCategory(req, res, next);
});

router.route("/sync/:categoryId").get((req, res, next) => {
    /*  #swagger.tags = ['Category Admin']
        #swagger.summary = 'Sync products for a category from ShipRocket'
        #swagger.parameters['categoryId'] = { description: 'Category ID' }
    */
    getProductsByCategoryShipRocket(req, res, next);
});

/*----------------------CATEGORY BREADCRUMBS------------------*/
router.route("/:id/breadcrumbs").get((req, res, next) => {
    /*  #swagger.tags = ['Category']
        #swagger.summary = 'Get category breadcrumbs'
        #swagger.parameters['id'] = { description: 'Category ID' }
    */
    getCategoryBreadcrumbs(req, res, next);
});

/*----------------------CATEGORY TREE------------------*/

export default router;
