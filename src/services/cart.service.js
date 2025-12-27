// services/cart.service.js
import { Cart } from "../models/cart.model.js";
import { CartItem } from "../models/cart.model.js";
import { ApiError } from "../utils/ApiError.js";
import { Product } from "../models/product.model.js";
import { ProductVariant } from "../models/productVariant.js";
import { ProductImage } from "../models/productImage.model.js";

/* ---------------- GET OR CREATE CART ---------------- */
export const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId, isActive: true });
  if (!cart) {
    cart = await Cart.create({ userId });
  }
  return cart;
};

/* ---------------- ADD TO CART ---------------- */
// export const addToCartService = async ({
//   userId,
//   productId,
//   variantId,
//   quantity = 1,
//   price,
// }) => {
//   const cart = await getOrCreateCart(userId);

//   const cartItem = await CartItem.findOneAndUpdate(
//     {
//       cartId: cart._id,
//       productId,
//       variantId: variantId || null,
//     },
//     {
//       $inc: { quantity },
//       $setOnInsert: { price },
//     },
//     {
//       new: true,
//       upsert: true,
//     }
//   );

//   return cartItem;
// };

export const addToCartService = async ({
  userId,
  productId,
  variantId,
  quantity = 1,
}) => {
  if (quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  /* ---------------- PRODUCT VALIDATION ---------------- */
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
    isDeleted: false,
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  /* ---------------- VARIANT VALIDATION ---------------- */
  let price = product.salePrice ?? product.price;
  let availableStock = product.stockQuantity;

  if (variantId) {
    const variant = await ProductVariant.findOne({
      _id: variantId,
      productId,
      isActive: true,
    });

    if (!variant) {
      throw new ApiError(404, "Product variant not found");
    }

    price = variant.price;
    availableStock = variant.stockQuantity;
  }

  /* ---------------- STOCK CHECK ---------------- */
  if (availableStock < quantity) {
    throw new ApiError(
      409,
      `Only ${availableStock} item(s) available in stock`
    );
  }

  /* ---------------- GET / CREATE CART ---------------- */
  const cart = await getOrCreateCart(userId);

  /* ---------------- UPSERT CART ITEM ---------------- */
  const cartItem = await CartItem.findOneAndUpdate(
    {
      cartId: cart._id,
      productId,
      variantId: variantId || null,
    },
    {
      $inc: { quantity },
      $setOnInsert: { price },
    },
    {
      new: true,
      upsert: true,
    }
  );

  /* ---------------- FINAL QUANTITY VALIDATION ---------------- */
  if (cartItem.quantity > availableStock) {
    await CartItem.findByIdAndDelete(cartItem._id);
    throw new ApiError(409, `Cannot add more than ${availableStock} item(s)`);
  }

  return cartItem;
};

/* -------------------------------------------------------------------------- */
/*                              APPLY COUPON                                   */
/* -------------------------------------------------------------------------- */
const applyCoupon = async (couponCode, subtotal) => {
  if (!couponCode) return 0;

  // Example coupons (replace with Coupon model later)
  if (couponCode === "SAVE10" && subtotal >= 1000) {
    return 100;
  }

  if (couponCode === "SAVE20" && subtotal >= 2000) {
    return 200;
  }

  return 0;
};

/* -------------------------------------------------------------------------- */
/*                       GET CART WITH TAX + SHIPPING                            */
/* -------------------------------------------------------------------------- */

export const getCartService = async (userId, couponCode = null) => {
  const cart = await Cart.findOne({ userId, isActive: true });

  if (!cart) {
    return {
      items: [],
      summary: {
        subtotal: 0,
        tax: 0,
        discount: 0,
        shipping: 0,
        grandTotal: 0,
      },
      canCheckout: false,
    };
  }

  const cartItems = await CartItem.find({ cartId: cart._id })
    .populate({
      path: "productId",
      select: "name price salePrice stockQuantity isActive status",
    })
    .populate({
      path: "variantId",
      select: "sku stockQuantity isActive",
    });

  /* ---------------- FETCH IMAGES ---------------- */
  const productIds = cartItems.map((i) => i.productId?._id);
  const variantIds = cartItems.map((i) => i.variantId).filter(Boolean);

  const images = await ProductImage.find({
    $or: [
      { productId: { $in: productIds }, variantId: null },
      { variantId: { $in: variantIds } },
    ],
  });

  /* ---------------- IMAGE MAP ---------------- */
  const imageMap = new Map();

  images.forEach((img) => {
    const key = img.variantId ? `v_${img.variantId}` : `p_${img.productId}`;

    if (!imageMap.has(key)) {
      imageMap.set(key, img.imageUrl);
    }
  });

  let subtotal = 0;
  let canCheckout = true;

  const items = cartItems.map((item) => {
    const product = item.productId;
    const variant = item.variantId;

    if (!product || !product.isActive) {
      canCheckout = false;
      return {
        cartItemId: item._id,
        productId: null,
        name: "Product unavailable",
        quantity: item.quantity,
        price: 0,
        subtotal: 0,
        availableStock: 0,
        inStock: false,
        image: null,
      };
    }

    // const unitPrice = product.salePrice ?? product.price;
    const unitPrice = variant?.price ?? product.salePrice ?? product.price;

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    const inStock =
      product.stockQuantity >= item.quantity && product.status === "active";

    if (!inStock) canCheckout = false;

    /* ---------------- IMAGE RESOLUTION ---------------- */
    let image = null;

    if (item.variantId && imageMap.has(`v_${item.variantId}`)) {
      image = imageMap.get(`v_${item.variantId}`);
    } else if (imageMap.has(`p_${product._id}`)) {
      image = imageMap.get(`p_${product._id}`);
    }

    return {
      cartItemId: item._id,
      productId: product._id,
      variantId: item.variantId || null,
      name: product.name,
      sku: variant?.sku || product.sku,
      image,
      price: unitPrice,
      quantity: item.quantity,
      subtotal: itemSubtotal,
      availableStock: product.stockQuantity,
      inStock,
    };
  });

  /* ---------------- TAX & SHIPPING ---------------- */
  const tax = Math.round(subtotal * 0.18);
  const shipping = subtotal >= 1000 ? 0 : 50;

  /* ---------------- COUPON ---------------- */
  const discount = await applyCoupon(couponCode, subtotal);

  const grandTotal = Math.max(subtotal + tax + shipping - discount, 0);

  return {
    items,
    summary: {
      subtotal,
      tax,
      discount,
      shipping,
      grandTotal,
    },
    canCheckout,
  };
};

/* ---------------- UPDATE QUANTITY ---------------- */
export const updateCartItemQtyService = async ({
  userId,
  cartItemId,
  quantity,
}) => {
  if (quantity < 1) {
    throw new ApiError(400, "Quantity must be at least 1");
  }

  const cart = await Cart.findOne({ userId, isActive: true });
  if (!cart) throw new ApiError(404, "Cart not found");

  const item = await CartItem.findOneAndUpdate(
    { _id: cartItemId, cartId: cart._id },
    { quantity },
    { new: true }
  );

  if (!item) throw new ApiError(404, "Cart item not found");

  return item;
};

/* ---------------- REMOVE ITEM ---------------- */
export const removeCartItemService = async ({ userId, cartItemId }) => {
  const cart = await Cart.findOne({ userId, isActive: true });
  if (!cart) throw new ApiError(404, "Cart not found");

  const removed = await CartItem.findOneAndDelete({
    _id: cartItemId,
    cartId: cart._id,
  });

  if (!removed) throw new ApiError(404, "Cart item not found");

  return removed;
};

/* -------------------------------------------------------------------------- */
/*                   MERGE GUEST CART AFTER LOGIN                               */
/* -------------------------------------------------------------------------- */
export const mergeGuestCartService = async (userId, guestItems = []) => {
  await session.withTransaction(async () => {
    if (!guestItems.length) return;

    const cart = await getOrCreateCart(userId);

    for (const item of guestItems) {
      const existing = await CartItem.findOne({
        cartId: cart._id,
        productId: item.productId,
        variantId: item.variantId || null,
      });

      if (existing) {
        existing.quantity += item.quantity;
        await existing.save();
      } else {
        await CartItem.create({
          cartId: cart._id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          price: item.price,
        });
      }
    }
  });
};
