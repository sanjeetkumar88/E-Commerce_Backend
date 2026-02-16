import mongoose from "mongoose";
import { Order, OrderItem } from "../models/order.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {createShiprocketCheckoutSession} from "../services/shiprocket.service.js";
import { getCart } from "../services/cart.service.js";

export const createCheckoutSession = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const { items } = await getCart(user._id, "IN");

    

    if (!items || !Array.isArray(items) || !items.length) {
      throw new ApiError(400, "Cart items are required");
    }

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    // 1️ Create empty order first
    const order = await Order.create(
      [
        {
          userId: user._id,
          orderNumber,
          orderStatus: "created",
          paymentStatus: "pending",
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 0,
        },
      ],
      { session },
    );

    const newOrder = order[0];

    const shiprocketItems = [];

    

    // 2️ Loop cart items
    for (const item of items) {
      if (!item.variantId || !item.quantity) {
        throw new ApiError(400, "Invalid cart item");
      }

      const variant = await ProductVariant.findById(item.variantId)
        .populate("productId")
        .session(session);

      if (!variant || !variant.isActive) {
        throw new ApiError(404, "Product variant not found");
      }

      if (!variant.shiprocketVariantId) {
        throw new ApiError(400, "Variant not synced with Shiprocket");
      }

      if (variant.stockQuantity < item.quantity) {
        throw new ApiError(
          400,
          `Only ${variant.stockQuantity} items left in stock`,
        );
      }

      let variantImageDoc = await ProductImage.findOne({
        productId: variant.productId._id,
        variantId: variant._id,
      }).session(session);

      // Fallback to product main image
      if (!variantImageDoc) {
        variantImageDoc = await ProductImage.findOne({
          productId: variant.productId._id,
          variantId: null,
        }).session(session);
      }

      const productImage = variantImageDoc?.imageUrl || null;

      const price = variant.salePrice || variant.price;
      const itemSubtotal = price * item.quantity;

      const taxRate = variant.taxRate || 0;
      const taxAmount = (itemSubtotal * taxRate) / 100;

      const discount =
        variant.salePrice && variant.salePrice < variant.price
          ? (variant.price - variant.salePrice) * item.quantity
          : 0;

      subtotal += itemSubtotal;
      totalTax += taxAmount;
      totalDiscount += discount;

      // 3️ Create OrderItem
      await OrderItem.create(
        [
          {
            orderId: newOrder._id,
            productId: variant.productId._id,
            variantId: variant._id,
            shiprocketVariantId: variant.shiprocketVariantId,
            title: item.name,
            handle: item.handle,
            sku: variant.sku,
            quantity: item.quantity,
            price,
            total: itemSubtotal,
            productImage,
            taxRate,
            taxAmount,
            discountAmount: discount,
            weight: variant.weight || 0,
          },
        ],
        { session },
      );

      shiprocketItems.push({
        shiprocketVariantId: variant.shiprocketVariantId,
        quantity: item.quantity,
      });
    }

    // 4️ Update order totals
    newOrder.subtotal = subtotal;
    newOrder.taxAmount = totalTax;
    newOrder.discountAmount = totalDiscount;
    newOrder.totalAmount = subtotal + totalTax;
    await newOrder.save({ session });

    // 5️ Call Shiprocket
    const redirectUrl = `${process.env.FRONTEND_URL}/checkout-success?orderId=${newOrder._id}`;

    const checkout = await createShiprocketCheckoutSession(
      shiprocketItems,
      redirectUrl,
      user,
    );

    
    newOrder.shiprocketCheckoutId = checkout.checkoutId;
    await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          checkoutId: checkout.checkoutId,
          orderId: newOrder._id,
        },
        "Checkout session created successfully",
      ),
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
