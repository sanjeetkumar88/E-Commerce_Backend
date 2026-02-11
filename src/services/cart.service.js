import mongoose from "mongoose";
import { Cart, CartItem } from "../models/cart.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { ApiError } from "../utils/ApiError.js";

export const addToCart = async (
  userId,
  productId,
  variantId,
  quantity = 1
) => {
  if (!mongoose.Types.ObjectId.isValid(productId))
    throw new ApiError(400, "Invalid product ID");

  if (!mongoose.Types.ObjectId.isValid(variantId))
    throw new ApiError(400, "Invalid variant ID");

  if (quantity < 1)
    throw new ApiError(400, "Quantity must be at least 1");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let cart = await Cart.findOne({ userId }).session(session);

    if (!cart) {
      cart = await Cart.create([{ userId }], { session });
      cart = cart[0];
    }

    const variant = await ProductVariant.findOne({
      _id: variantId,
      isActive: true,
    })
      .populate("productId")
      .session(session);

    if (!variant)
      throw new ApiError(404, "Product variant not found");

    if (variant.stockQuantity < quantity)
      throw new ApiError(
        400,
        `Only ${variant.stockQuantity} items left in stock`
      );

    const price = variant.salePrice ?? variant.price;

    const existingItem = await CartItem.findOne({
      cartId: cart._id,
      productId,
      variantId,
    }).session(session);

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;

      if (variant.stockQuantity < newQty)
        throw new ApiError(
          400,
          `Only ${variant.stockQuantity} items available`
        );

      existingItem.quantity = newQty;
      existingItem.price = mongoose.Types.Decimal128.fromString(
        price.toString()
      );

      await existingItem.save({ session });
    } else {
      await CartItem.create(
        [
          {
            cartId: cart._id,
            productId,
            variantId,
            quantity,
            price: mongoose.Types.Decimal128.fromString(
              price.toString()
            ),
            productName: variant.productId.name,
            variantName:
              `${variant.color || ""} ${variant.size || ""}`.trim() ||
              "Standard",
            sku: variant.sku,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return { success: true, message: "Added to cart" };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err instanceof ApiError
      ? err
      : new ApiError(500, "Failed to add to cart");
  }
};


export const getCart = async (userId, userState = "IN") => {
  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return {
      items: [],
      subtotal: 0,
      totalTax: 0,
      discount: 0,
      grandTotal: 0,
    };
  }

  const cartItems = await CartItem.find({ cartId: cart._id })
    .populate({
      path: "variantId",
      populate: { path: "productId" },
    });

  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;


  const formattedItems = [];

  for (const item of cartItems) {
    const variant = item.variantId;
    const product = variant?.productId;

    if (!variant || !product || !variant.isActive || product.isDeleted) {
      continue;
    }

    /* ---------------- IMAGE LOGIC ---------------- */

    console.log("Fetching image for variant:", variant._id);

    let image = await ProductImage.findOne({
      variantId: variant._id,
      productId: variant.productId._id,
    }).lean();


    if (!image) {
      image = await ProductImage.findOne({
        productId: variant.productId._id,
        variantId: null,
      }).lean();
    }

    /* ---------------- PRICE REFRESH ---------------- */

    const currentPrice = variant.salePrice ?? variant.price;

    if (parseFloat(item.price.toString()) !== currentPrice) {
      item.price = mongoose.Types.Decimal128.fromString(
        currentPrice.toString()
      );
      await item.save();
    }

    const quantity = item.quantity;

    /* ---------------- STOCK ---------------- */

    const stockWarning =
      variant.stockQuantity < quantity
        ? `Only ${variant.stockQuantity} left`
        : null;

    /* ---------------- CALCULATIONS ---------------- */

    const itemSubtotal = currentPrice * quantity;

    const taxRate = variant.taxRate || 0;
    const taxAmount = (itemSubtotal * taxRate) / 100;

    const savings =
      variant.salePrice && variant.salePrice < variant.price
        ? (variant.price - variant.salePrice) * quantity
        : 0;

    subtotal += itemSubtotal;
    totalTax += taxAmount;
    totalDiscount += savings;

    formattedItems.push({
      _id: item._id,
      productId: product._id,
      variantId: variant._id,
      handle: product.handle,
      name: item.productName,
      sku: item.sku,
      quantity,
      price: currentPrice,
      compareAtPrice: variant.price,
      savings,
      stockWarning,
      color: variant.color,
      size: variant.size,
      stock: variant.stockQuantity,
      image: image?.imageUrl || null,

      tax: {
        rate: taxRate,
        amount: taxAmount,
        ...(userState === "IN"
          ? {
              cgst: taxAmount / 2,
              sgst: taxAmount / 2,
            }
          : {
              igst: taxAmount,
            }),
      },

      itemSubtotal,
      itemTotal: itemSubtotal + taxAmount,
    });
  }

  const grandTotal = subtotal + totalTax;

  return {
    items: formattedItems,
    subtotal,
    totalTax,
    discount: totalDiscount,
    grandTotal,
  };
};


export const updateCartQuantity = async (cartItemId, quantity) => {
  if (!mongoose.Types.ObjectId.isValid(cartItemId))
    throw new ApiError(400, "Invalid cart item ID");

  if (quantity < 1)
    throw new ApiError(400, "Quantity must be at least 1");

  const item = await CartItem.findById(cartItemId).populate("variantId");

  if (!item)
    throw new ApiError(404, "Cart item not found");

  if (!item.variantId || !item.variantId.isActive)
    throw new ApiError(400, "Variant is inactive");

  if (item.variantId.stockQuantity < quantity)
    throw new ApiError(
      400,
      `Only ${item.variantId.stockQuantity} available`
    );

  item.quantity = quantity;
  await item.save();

  return { success: true };
};


export const removeCartItem = async (cartItemId) => {
  if (!mongoose.Types.ObjectId.isValid(cartItemId))
    throw new ApiError(400, "Invalid cart item ID");

  const item = await CartItem.findByIdAndDelete(cartItemId);

  if (!item)
    throw new ApiError(404, "Cart item not found");

  return { success: true };
};

export const mergeGuestCartService = async (
  userId,
  guestItems = []
) => {
  if (!Array.isArray(guestItems))
    throw new ApiError(400, "Invalid guest cart format");

  if (!guestItems.length)
    return { message: "No guest items to merge" };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let cart = await Cart.findOne({ userId }).session(session);

    if (!cart) {
      cart = await Cart.create([{ userId }], { session });
      cart = cart[0];
    }

    for (const guestItem of guestItems) {
      const { productId, variantId, quantity } = guestItem;

      if (!variantId || quantity < 1) continue;

      const variant = await ProductVariant.findById(variantId)
        .populate("productId")
        .session(session);

      if (!variant || !variant.isActive) continue;

      const availableStock = variant.stockQuantity;
      if (availableStock <= 0) continue;

      const finalQty = Math.min(quantity, availableStock);
      const currentPrice = variant.salePrice ?? variant.price;

      await CartItem.findOneAndUpdate(
        { cartId: cart._id, productId, variantId },
        {
          $inc: { quantity: finalQty },
          $set: {
            price: mongoose.Types.Decimal128.fromString(
              currentPrice.toString()
            ),
            productName: variant.productId.name,
            variantName:
              `${variant.color || ""} ${variant.size || ""}`.trim() ||
              "Standard",
            sku: variant.sku,
            isActive: true,
          },
        },
        { upsert: true, new: true, session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      success: true,
      message: "Guest cart merged successfully",
      cartId: cart._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error instanceof ApiError
      ? error
      : new ApiError(500, "Failed to merge guest cart");
  }
};


