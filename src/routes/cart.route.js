// routes/cart.route.js
import express from "express";
import {
  addToCart,
  getCart,
  updateCartItemQty,
  removeCartItem,
  mergeGuestCart,
} from "../controllers/cartController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(verifyJWT, getCart).post(verifyJWT, addToCart);

router.route("/merge").post(verifyJWT, mergeGuestCart);

router
  .route("/:id")
  .patch(verifyJWT, updateCartItemQty)
  .delete(verifyJWT, removeCartItem);

export default router;
