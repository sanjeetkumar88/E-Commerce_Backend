import { Router } from "express";
import { 
  getCart, 
  addToCart, 
  updateCartQuantity, 
  removeCartItem, 
  mergeGuestCart 
} from "../controllers/cartController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all cart routes
router.use(verifyJWT);

router.route("/")
  .get(getCart)          // GET /api/v1/cart?state=IN
  .post(addToCart);      // POST /api/v1/cart

router.route("/merge")
  .post(mergeGuestCart); // POST /api/v1/cart/merge

router.route("/item/:cartItemId")
  .patch(updateCartQuantity) // PATCH /api/v1/cart/item/ID
  .delete(removeCartItem);   // DELETE /api/v1/cart/item/ID

export default router; 