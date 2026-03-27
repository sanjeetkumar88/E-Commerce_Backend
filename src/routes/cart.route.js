import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeCartItem,
  mergeGuestCart,
  clearCart,
} from "../controllers/cartController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all cart routes
router.use(verifyJWT);

router.route("/").get(getCart).post(addToCart);      // POST /api/v1/cart

router.route("/merge").post(mergeGuestCart); // POST /api/v1/cart/merge

router.route("/clear").delete(clearCart); // DELETE /api/v1/cart/clear

router.route("/remove/:cartItemId").delete(removeCartItem); // DELETE /api/v1/cart/remove/ID

router.route("/update/:cartItemId").patch(updateCartQuantity)   // PATCH /api/v1/cart/update/ID

export default router; 