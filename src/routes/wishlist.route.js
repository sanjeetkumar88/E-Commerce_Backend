import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveWishlistToCart,
  mergeGuestWishlist
} from "../controllers/wishlistController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Apply authentication to all wishlist routes
router.use(verifyJWT);

router.route("/")
  .get((req, res, next) => {
    /*  #swagger.tags = ['Wishlist']
        #swagger.summary = 'Get user wishlist'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getWishlist(req, res, next);
  })
  .post((req, res, next) => {
    /*  #swagger.tags = ['Wishlist']
        #swagger.summary = 'Add item to wishlist'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            productId: { type: "string" },
                            variantId: { type: "string" }
                        }
                    }
                }
            }
        }
    */
    addToWishlist(req, res, next);
  });

router.route("/merge")
  .post((req, res, next) => {
    /*  #swagger.tags = ['Wishlist']
        #swagger.summary = 'Merge guest wishlist with user wishlist'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    mergeGuestWishlist(req, res, next);
  });

router.route("/item/:wishlistItemId")
  .delete((req, res, next) => {
    /*  #swagger.tags = ['Wishlist']
        #swagger.summary = 'Remove item from wishlist'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['wishlistItemId'] = { description: 'Wishlist Item ID' }
    */
    removeFromWishlist(req, res, next);
  });

router.route("/move-to-cart/:wishlistItemId")
  .post((req, res, next) => {
    /*  #swagger.tags = ['Wishlist']
        #swagger.summary = 'Move wishlist item to cart'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['wishlistItemId'] = { description: 'Wishlist Item ID' }
    */
    moveWishlistToCart(req, res, next);
  });

export default router;