import mongoose from "mongoose";
import { Order, OrderItem } from "../models/order.model.js";
import { ProductVariant } from "../models/productVarient.model.js";
import { ProductImage } from "../models/productImage.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createShiprocketCheckoutSession } from "../services/shiprocket.service.js";
import { getCart } from "../services/cart.service.js";
import { fetchOrderDetailsFromShiprocket, createShiprocketOrder } from "../services/shiprocket.service.js";

export const createCheckoutSession = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = req.user;

    const { items } = await getCart(user._id, "IN");

    if (!items || !Array.isArray(items) || !items.length) {
      throw new ApiError(400, "Cart is empty");
    }

    /* ---------------- CREATE ORDER ---------------- */
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const [order] = await Order.create(
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
      { session }
    );

    const shiprocketItems = [];

    /* ---------------- PROCESS CART ---------------- */
    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId)
        .populate("productId")
        .session(session);

      if (!variant || !variant.isActive) {
        throw new ApiError(404, "Variant not found");
      }

      if (!variant.shiprocketVariantId) {
        throw new ApiError(400, "Variant not synced with Shiprocket");
      }

      if (variant.stockQuantity < item.quantity) {
        throw new ApiError(
          400,
          `Only ${variant.stockQuantity} left for ${variant.sku}`
        );
      }

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

      /* ---------------- IMAGE FETCHING ---------------- */
      const itemImage = await ProductImage.findOne({
        $or: [
          { variantId: variant._id, isPrimary: true },
          { variantId: variant._id },
          { productId: variant.productId._id, isPrimary: true, variantId: null },
          { productId: variant.productId._id, variantId: null },
        ],
      }).session(session);

      /* ---------------- ORDER ITEM ---------------- */
      await OrderItem.create(
        [
          {
            orderId: order._id,
            productId: variant.productId._id,
            variantId: variant._id,
            shiprocketVariantId: variant.shiprocketVariantId,
            title: item.name,
            handle: item.handle,
            sku: variant.sku,
            quantity: item.quantity,
            price,
            total: itemSubtotal,
            taxRate,
            taxAmount,
            discountAmount: discount,
            weight: variant.weight || 0,
            productImage: itemImage?.imageUrl || "",
          },
        ],
        { session }
      );

      shiprocketItems.push({
        shiprocketVariantId: variant.shiprocketVariantId,
        quantity: item.quantity,
      });
    }

    /* ---------------- UPDATE TOTALS ---------------- */
    order.subtotal = subtotal;
    order.taxAmount = totalTax;
    order.discountAmount = totalDiscount;
    order.totalAmount = subtotal + totalTax;

    console.log("Order Totals:", { subtotal, totalTax, totalDiscount, totalAmount: order.totalAmount });

    await order.save({ session });

    /* ---------------- CREATE CHECKOUT ---------------- */
    const redirectUrl = `${process.env.FRONTEND_URL}/checkout-success?orderId=${order._id}`;

    const checkout = await createShiprocketCheckoutSession(
      shiprocketItems,
      redirectUrl,
      user,
      order._id.toString()
    );

    /* ---------------- SAVE SHIPROCKET DATA ---------------- */
    order.shiprocketCheckoutOrderId =
      checkout.response?.result?.data?.order_id;

    order.shiprocketCheckoutId =
      checkout.response?.result?.token;

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(
      new ApiResponse(200, checkout.response, "Checkout created successfully")
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const shiprocketCreateOrder = async (req, res, next) => {
  const { orderId, shiprocketId } = req.body;
  if (!orderId || !shiprocketId) {
    return res.status(400).json(new ApiResponse(400, null, "orderId and shiprocketId are required"));
  }

  try {
    const orderDetails = await fetchOrderDetailsFromShiprocket(shiprocketId);

    if (!orderDetails) {
      return res.status(404).json(new ApiResponse(404, null, "Order details not found in Shiprocket"));
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status: orderDetails.status,
        paymentStatus: orderDetails.payment_status,
        shippingAmount: orderDetails.shipping_amount,
        totalAmount: orderDetails.total_amount_payable,
        paymentType: orderDetails.payment_type,
        rawShiprocketResponse: orderDetails,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json(new ApiResponse(404, null, "Order not found"));
    }
    var shiprocketOrder;
    if (!order.shiprocketOrderId) {
      // Normalize billing address from Shiprocket response
      const billing = {
        first_name: orderDetails.billing_address.firstname || orderDetails.billing_address.first_name || order.shippingAddress.firstName,
        last_name: orderDetails.billing_address.lastname || orderDetails.billing_address.last_name || order.shippingAddress.lastName,
        line1: orderDetails.billing_address.address || orderDetails.billing_address.line1 || order.shippingAddress.address1,
        line2: orderDetails.billing_address.address_2 || orderDetails.billing_address.line2 || order.shippingAddress.address2 || "",
        city: orderDetails.billing_address.city || order.shippingAddress.city,
        pincode: orderDetails.billing_address.pincode || orderDetails.billing_address.zipcode || order.shippingAddress.pincode,
        state: orderDetails.billing_address.state || order.shippingAddress.state,
        email: orderDetails.billing_address.email || order.shippingAddress.email,
        phone: orderDetails.billing_address.phone || order.shippingAddress.mobile,
      };

      shiprocketOrder = await createShiprocketOrder(order, billing);
    }

    console.log("Shiprocket Order Created:", shiprocketOrder);

    if (shiprocketOrder) {
      await Order.findByIdAndUpdate(orderId, {
        shiprocketOrderId: shiprocketOrder.order_id,
        shiprocketShipmentId: shiprocketOrder.shipment_id,
        // Optional: save status if returned
        shipmentStatus: shiprocketOrder.status,
      });
    }

    return res.status(200).json(new ApiResponse(200, order, "Order updated with Shiprocket details"));
  } catch (error) {
    next(error);
  }
}




