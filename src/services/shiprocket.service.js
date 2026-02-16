import axios from "axios";
import { ApiError } from "../utils/ApiError.js";
import { generateHmac } from "../utils/shiprocket.js";

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";
// const CHECKOUT_URL =
//   process.env.NODE_ENV === "development"
//     ? "https://fastrr-api-dev.pickrr.com/api/v1/access-token/checkout"
//     : "https://checkout-api.shiprocket.com/api/v1/access-token/checkout";

const CHECKOUT_URL = "https://checkout-api.shiprocket.com/api/v1/access-token/checkout";

export const createShiprocketCheckoutSession = async (
  cartItems,
  redirectUrl,
  user = null,
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
    };

    const payloadString = JSON.stringify(payload);

    const signature = generateHmac(
      payloadString,
      process.env.SHIPROCKET_API_SECRET,
    );

    console.log("shiprocket secret", process.env.SHIPROCKET_API_SECRET);
    console.log("shiprocket payload", signature);

    const response = await axios.post(CHECKOUT_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.SHIPROCKET_API_KEY,
        "X-Api-HMAC-SHA256": signature,

      },
    });

    if (!response.data?.token) {
      throw new ApiError(500, "Failed to generate checkout token");
    }

    return {
      token: response.data.token,
      checkoutId: response.data.checkout_id,
      expiresAt: response.data.expires_at,
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
