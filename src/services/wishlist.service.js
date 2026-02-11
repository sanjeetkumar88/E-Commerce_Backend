import { Wishlist, WishlistItem } from "../models/wishlist.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { addToCart } from "./cart.service.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

export const addToWishlist = async (userId, productId, variantId) => {
  if (!mongoose.Types.ObjectId.isValid(productId))
    throw new ApiError(400, "Invalid product ID");

  if (!mongoose.Types.ObjectId.isValid(variantId))
    throw new ApiError(400, "Invalid variant ID");

  const variant = await ProductVariant.findOne({
    _id: variantId,
    isActive: true,
  }).populate("productId");

  if (!variant)
    throw new ApiError(404, "Product variant not found");

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId });
  }

  await WishlistItem.findOneAndUpdate(
    { wishlistId: wishlist._id, productId, variantId },
    {},
    { upsert: true, new: true }
  );

  return { success: true, message: "Added to wishlist" };
};

export const removeFromWishlist = async (wishlistItemId) => {
  if (!mongoose.Types.ObjectId.isValid(wishlistItemId))
    throw new ApiError(400, "Invalid wishlist item ID");

  const deleted = await WishlistItem.findByIdAndDelete(wishlistItemId);

  if (!deleted)
    throw new ApiError(404, "Wishlist item not found");

  return { success: true };
};

export const mergeGuestWishlistService = async (
  userId,
  guestItems = []
) => {
  if (!Array.isArray(guestItems))
    throw new ApiError(400, "Invalid guest wishlist format");

  if (!guestItems.length)
    return { message: "No guest items to merge" };

  let wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ userId });
  }

  for (const item of guestItems) {
    const { productId, variantId } = item;

    if (!variantId) continue;

    const variant = await ProductVariant.findOne({
      _id: variantId,
      isActive: true,
    });

    if (!variant) continue;

    await WishlistItem.findOneAndUpdate(
      { wishlistId: wishlist._id, productId, variantId },
      {},
      { upsert: true }
    );
  }

  return {
    success: true,
    message: "Guest wishlist merged successfully",
  };
};

export const moveWishlistToCart = async (
  userId,
  wishlistItemId
) => {
  const item = await WishlistItem.findById(wishlistItemId)
    .populate("variantId");

  if (!item)
    throw new ApiError(404, "Wishlist item not found");

  await addToCart(
    userId,
    item.productId,
    item.variantId._id,
    1
  );

  await WishlistItem.findByIdAndDelete(wishlistItemId);

  return { success: true, message: "Moved to cart" };
};

export const getWishlist = async (userId) => {
  const wishlist = await Wishlist.findOne({ userId });

  if (!wishlist) return { items: [] };

  const items = await WishlistItem.find({
    wishlistId: wishlist._id,
  })
    .populate({
      path: "variantId",
      populate: { path: "productId" },
    });

  const formatted = [];

  for (const item of items) {
    const variant = item.variantId;
    if (!variant || !variant.isActive) continue;

    const product = variant.productId;
    if (!product || product.isDeleted) continue;

    /* ---------------- GET IMAGE ---------------- */

    // 1️⃣ Try variant primary image
    let image = await ProductImage.findOne({
      variantId: variant._id,
      productId: variant.productId,
    }).lean();

    // 2️⃣ Fallback to product primary image
    if (!image) {
      image = await ProductImage.findOne({
        productId: product._id,
        variantId: null,
      }).lean();
    }

    formatted.push({
      id: item._id,
      productId: product._id,
      variantId: variant._id,
      name: product.name,
      handle: product.handle, // important
      price: variant.salePrice ?? variant.price,
      compareAtPrice: variant.price,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      stock: variant.stockQuantity,
      image: image?.imageUrl || null,
    });
  }

  return { items: formatted };
};