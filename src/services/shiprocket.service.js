import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { generateHmac, getShiprocketToken } from "../utils/shiprocket.js";
import { OrderItem } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ProductVariant } from "../models/productVarient.model.js";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

const CHECKOUT_URL = "https://checkout-api.shiprocket.com/api/v1/access-token/checkout";

export const createShiprocketCheckoutSession = async (
  cartItems,
  redirectUrl,
  user = null,
  orderReferenceId = null,
) => {
  try {
    if (!Array.isArray(cartItems) || !cartItems.length) {
      throw new ApiError(400, "Cart is empty");
    }

    const shiprocketItems = cartItems.map((item) => {
      if (!item.shiprocketVariantId) {
        throw new ApiError(400, "Variant not synced with Shiprocket");
      }

      return {
        variant_id: item.shiprocketVariantId,
        quantity: Number(item.quantity),
      };
    });

    console.log("shiprocketItems", shiprocketItems);

    

    const payload = {
      cart_data:{items: shiprocketItems},
      redirect_url: redirectUrl,
      timestamp: new Date().toISOString(),
      order_reference_id: orderReferenceId,
    };

    const payloadString = JSON.stringify(payload);

    const signature = generateHmac(
      payloadString,
      process.env.SHIPROCKET_API_SECRET,
    );

    // console.log("shiprocket secret", process.env.SHIPROCKET_API_SECRET);
    // console.log("shiprocket payload", signature);

    const response = await axios.post(CHECKOUT_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.SHIPROCKET_API_KEY,
        "X-Api-HMAC-SHA256": signature,

      },
    });
    console.log("Shiprocket Checkout Response:", response.data);

    if (!response.data?.result?.token) {
      throw new ApiError(500, "Failed to generate checkout token");
    }

    return {
      response: response.data,
    };
  } catch (error) {
    console.error(
      "Shiprocket Checkout Error:",
      error?.response?.data || error.message,
    );
    throw new ApiError(
      error?.response?.status || 500,
      error?.response?.data?.error.message || "Checkout session creation failed",
    );
  }
};

export const fetchOrderDetailsFromShiprocket = async (shiprocketId) => {
  try {
    const apiKey = process.env.SHIPROCKET_API_KEY;
    const apiSecret = process.env.SHIPROCKET_API_SECRET;
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ order_id: shiprocketId, timestamp });

    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(payload)
      .digest('base64');

    const response = await axios.post(
      'https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Api-HMAC-SHA256': signature,
        },
      },
    );

    return response.data.result;
  } catch (error) {
    console.error("Shiprocket Order Details Error:", error.message);
    throw new ApiError(
      error?.response?.status || 500,
      error?.response?.data?.error.message || "Failed to fetch order details",
    );
  }
};

export const createShiprocketOrder = async (orderId) => {
  /* ---------------- 1. ATOMIC LOCK ---------------- */
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shiprocketOrderId: { $exists: false },
      shiprocketProcessing: false,
    },
    {
      $set: { shiprocketProcessing: true },
      $inc: { shiprocketAttempts: 1 },
    },
    { new: true }
  );

  if (!order) {
    return { skipped: true }; // already processing or done
  }

  try {
    /* ---------------- 2. FETCH ITEMS ---------------- */
    const items = await OrderItem.find({ orderId }).lean();

    if (!items.length) throw new Error("No order items");

    /* ---------------- 3. VARIANTS ---------------- */
    const variants = await ProductVariant.find({
      _id: { $in: items.map((i) => i.variantId) },
    }).lean();

    const variantMap = new Map(
      variants.map((v) => [v._id.toString(), v])
    );

    /* ---------------- 4. STOCK UPDATE ---------------- */
    for (const item of items) {
      const updated = await ProductVariant.findOneAndUpdate(
        {
          _id: item.variantId,
          stockQuantity: { $gte: item.quantity },
        },
        { $inc: { stockQuantity: -item.quantity } }
      );

      if (!updated) {
        throw new Error(`Stock issue: ${item.title}`);
      }
    }

    /* ---------------- 5. BUILD ITEMS ---------------- */
    const shiprocketItems = items.map((item) => ({
      name: item.title,
      sku: item.sku,
      units: item.quantity,
      selling_price: item.price,
    }));

    /* ---------------- 6. API CALL ---------------- */
    const token = await getShiprocketToken();

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      {
        order_id: order.orderNumber,
        order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,

        billing_customer_name: order.billingAddress.firstName,
        billing_address: order.billingAddress.address1,
        billing_city: order.billingAddress.city,
        billing_pincode: order.billingAddress.pincode,
        billing_state: order.billingAddress.state,
        billing_phone: order.billingAddress.mobile,

        shipping_is_billing: true,

        order_items: shiprocketItems,

        payment_method:
          order.paymentStatus === "paid" ? "Prepaid" : "COD",

        sub_total: order.subtotal,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    const data = response.data;

    if (!data?.order_id) {
      throw new Error("Invalid Shiprocket response");
    }

    /* ---------------- 7. SUCCESS ---------------- */
    await Order.findByIdAndUpdate(orderId, {
      shiprocketOrderId: data.order_id,
      shiprocketShipmentId: data.shipment_id,
      shiprocketProcessing: false,
      orderStatus: "confirmed",
      rawShiprocketResponse: data,
    });

    return data;
  } catch (error) {
    console.error("Shiprocket Error:", error.message);

    /* ---------------- 8. FAILURE HANDLING ---------------- */
    await Order.findByIdAndUpdate(orderId, {
      shiprocketProcessing: false,
      shiprocketError: error.message,
    });

    throw error;
  }
};
