import * as wishlistService from "../services/wishlist.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @desc Add a product variant to the user's wishlist
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user._id;

    const result = await wishlistService.addToWishlist(userId, productId, variantId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Product added to wishlist"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Retrieve all items in the wishlist with image fallbacks and stock info
 */
export const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await wishlistService.getWishlist(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Wishlist fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Remove a specific item from the wishlist
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { wishlistItemId } = req.params;
    const result = await wishlistService.removeFromWishlist(wishlistItemId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Item removed from wishlist"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Move an item from the wishlist directly into the shopping cart
 */
export const moveWishlistToCart = async (req, res, next) => {
  try {
    const { wishlistItemId } = req.params;
    const userId = req.user._id;

    const result = await wishlistService.moveWishlistToCart(userId, wishlistItemId);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Item moved to cart successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Merge local storage guest wishlist items into authenticated user wishlist
 */
export const mergeGuestWishlist = async (req, res, next) => {
  try {
    const { guestItems } = req.body;
    const userId = req.user._id;

    const result = await wishlistService.mergeGuestWishlistService(userId, guestItems);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Guest wishlist merged successfully"));
  } catch (error) {
    next(error);
  }
};