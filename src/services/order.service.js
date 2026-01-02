import { Order, OrderItem } from "../models/order.model.js";
import { UserAddress } from "../models/userAddress.model.js";
import { createShiprocketOrder, generateShiprocketOrderPayload } from "./shiprocket/shipping/shiprocketOrder.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Create local order and push to Shiprocket
 * @param {object} params
 *  - userId
 *  - items: [{ productId, variantId, quantity, unitPrice, totalPrice, productName, productSku, weight, length, breadth, height }]
 *  - shippingAddressId
 *  - billingAddressId
 *  - orderData: { paymentMethod, notes, subtotal, totalAmount, shippingAmount, discountAmount, giftWrapAmount, transactionAmount }
 */
export const createOrder = async ({ userId, items, shippingAddressId, billingAddressId, orderData }) => {
  try {
    // ---------------- Fetch Addresses ----------------
    const shippingAddress = await UserAddress.findById(shippingAddressId).lean();
    const billingAddress = await UserAddress.findById(billingAddressId).lean();

    if (!shippingAddress || !billingAddress) {
      throw new ApiError(400, "Shipping or billing address not found");
    }

    // ---------------- Create Local Order ----------------
    const orderNumber = `ORD-${Date.now()}`;
    const newOrder = await Order.create({
      userId,
      orderNumber,
      status: "pending",
      paymentStatus: "pending",
      ...orderData,
    });

    // ---------------- Create Order Items ----------------
    for (const item of items) {
      await OrderItem.create({
        orderId: newOrder._id,
        ...item,
      });
    }

    // ---------------- Shiprocket Checkout ----------------
    const shipPayload = generateShiprocketOrderPayload(newOrder, items, shippingAddress, billingAddress);
    const shiprocketResponse = await createShiprocketOrder(shipPayload);

    return {
      order: newOrder,
      shiprocketResponse,
    };
  } catch (error) {
    throw error;
  }
};
