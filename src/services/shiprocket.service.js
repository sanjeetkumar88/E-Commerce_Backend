import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { generateHmac, getShiprocketToken } from "../utils/shiprocket.js";
import { OrderItem, Order } from "../models/order.model.js";
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
      cart_data: { items: shiprocketItems },
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
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ order_id: shiprocketId, timestamp });

    // const signature = crypto
    //   .createHmac('sha256', apiSecret)
    //   .update(payload)
    //   .digest('base64');

    const signature = generateHmac(payload, process.env.SHIPROCKET_API_SECRET,);

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
    console.log("Shiprocket Order Details Response:", response.data);
    return response.data.result;
  } catch (error) {
    console.error("Shiprocket Order Details Error:", error.message);
    throw new ApiError(
      error?.response?.status || 500,
      error?.response?.data?.error.message || "Failed to fetch order details",
    );
  }
};

export const createShiprocketOrder = async (order, billing) => {

  try {
    /* ---------------- 2. FETCH ITEMS ---------------- */
    const items = await OrderItem.find({ orderId: order._id }).lean();

    console.log("items", items);

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
    let totalWeight = 0;
    let maxLength = 0;
    let maxBreadth = 0;
    let totalHeight = 0;

    const shiprocketItems = items.map((item) => {
      const variant = variantMap.get(item.variantId.toString());

      // Accumulate weight (OrderItem.weight is in KG)
      totalWeight += (Number(item.weight) || 0) * item.quantity;

      // Calculate package dimensions
      if (variant?.dimensions) {
        maxLength = Math.max(maxLength, variant.dimensions.length || 0);
        maxBreadth = Math.max(maxBreadth, variant.dimensions.width || 0);
        totalHeight += (variant.dimensions.height || 0) * item.quantity;
      }

      return {
        name: item.title,
        sku: item.sku,
        units: item.quantity,
        selling_price: Number(item.price),
        discount: Number(item.discountAmount || 0),
        tax: Number(item.taxAmount || 0),
        hsn: variant?.hsnCode || '',
      };
    });

    /* ---------------- 6. API CALL ---------------- */

    const token = await getShiprocketToken();
    const payload = {
      order_id: order.orderNumber || order._id.toString(),
      order_date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || 'Default',
      billing_customer_name: billing.first_name,
      billing_last_name: billing.last_name,
      billing_address: billing.line1 + (billing.line2 ? `, ${billing.line2}` : ''),
      billing_city: billing.city,
      billing_pincode: billing.pincode,
      billing_state: billing.state,
      billing_country: 'India',
      billing_email: billing.email,
      billing_phone: billing.phone,
      shipping_is_billing: true,
      order_items: shiprocketItems,
      payment_method: order.paymentStatus === 'paid' ? 'Prepaid' : 'COD',
      shipping_charges: Number(order.shippingAmount || 0),
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: Number(order.discountAmount || 0),
      sub_total: Number(order.subtotal || 1000),
      length: maxLength || 10,
      breadth: maxBreadth || 10,
      height: totalHeight || 10,
      weight: totalWeight / 1000 || 0.5,
      total_tax: Number(order.taxAmount || 0),
    };

    console.log("Shiprocket Create Order Payload:", payload);

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = response.data;

    console.log("Shiprocket Create Order Response:", response.data);



    /* ---------------- 7. SUCCESS ---------------- */
    await Order.findByIdAndUpdate(order._id, {
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
    await Order.findByIdAndUpdate(order._id, {
      shiprocketProcessing: false,
      shiprocketError: error.message,
    });

    throw error;
  }
};
