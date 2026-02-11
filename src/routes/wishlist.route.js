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
  .get(getWishlist)         // GET /api/v1/wishlist
  .post(addToWishlist);     // POST /api/v1/wishlist

router.route("/merge")
  .post(mergeGuestWishlist); // POST /api/v1/wishlist/merge

router.route("/item/:wishlistItemId")
  .delete(removeFromWishlist); // DELETE /api/v1/wishlist/item/ID

router.route("/move-to-cart/:wishlistItemId")
  .post(moveWishlistToCart);   // POST /api/v1/wishlist/move-to-cart/ID

export default router;