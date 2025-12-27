// controllers/cart.controller.js
import * as cartService from "../services/cart.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/* ---------------- ADD TO CART ---------------- */
export const addToCart = async (req, res, next) => {
  try {
    const item = await cartService.addToCartService({
      userId: req.user.id,
      ...req.body,
    });

    res.status(201).json(new ApiResponse(201, item, "Item added to cart"));
  } catch (err) {
    next(err);
  }
};

/* ---------------- GET CART ---------------- */
export const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCartService(req.user.id, req.query.couponCode);
    res.status(200).json(new ApiResponse(200, cart));
  } catch (err) {
    next(err);
  }
};

/* ---------------- UPDATE QTY ---------------- */
export const updateCartItemQty = async (req, res, next) => {
  try {
    const item = await cartService.updateCartItemQtyService({
      userId: req.user.id,
      cartItemId: req.params.id,
      quantity: req.body.quantity,
    });

    res.status(200).json(new ApiResponse(200, item, "Quantity updated"));
  } catch (err) {
    next(err);
  }
};

/* ---------------- REMOVE ITEM ---------------- */
export const removeCartItem = async (req, res, next) => {
  try {
    await cartService.removeCartItemService({
      userId: req.user.id,
      cartItemId: req.params.id,
    });

    res.status(200).json(new ApiResponse(200, null, "Item removed"));
  } catch (err) {
    next(err);
  }
};


export const mergeGuestCart = async (req, res, next) => {
  try {
    await cartService.mergeGuestCartService(
      req.user.id,
      req.body.items
    );

    res.status(200).json(
      new ApiResponse(200, null, "Guest cart merged")
    );
  } catch (err) {
    next(err);
  }
};
