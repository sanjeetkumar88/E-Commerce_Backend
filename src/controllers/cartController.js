import * as cartService from "../services/cart.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @desc Add item to cart
 */
export const addToCart = async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user._id;

    const result = await cartService.addToCart(
      userId,
      productId,
      variantId,
      parseInt(quantity) || 1
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Item added to cart"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get user cart with tax and totals
 */
export const getCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // userState can be passed as a query param (e.g., ?state=IN)
    const { state = "IN" } = req.query;

    const cartData = await cartService.getCart(userId, state);

    return res
      .status(200)
      .json(new ApiResponse(200, cartData, "Cart fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update quantity of a specific item
 */
export const updateCartQuantity = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    const result = await cartService.updateCartQuantity(
      cartItemId, 
      parseInt(quantity)
    );

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Cart quantity updated"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Remove item from cart
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;

    const result = await cartService.removeCartItem(cartItemId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Item removed from cart"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Merge guest cart (from localStorage) into user cart
 */
export const mergeGuestCart = async (req, res, next) => {
  try {
    const { guestItems } = req.body;
    const userId = req.user._id;

    const result = await cartService.mergeGuestCartService(userId, guestItems);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Guest cart merged"));
  } catch (error) {
    next(error);
  }
};