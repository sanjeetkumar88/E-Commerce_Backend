import axios from "axios";
import crypto from "crypto";

// export const syncProductToShiprocket = async (payload) => {
//   const apiKey = process.env.SHIPROCKET_API_KEY;
//   const secret = process.env.SHIPROCKET_API_SECRET;

//   console.log(apiKey, secret);

//   const body = JSON.stringify(payload);

//   const hmac = crypto
//     .createHmac("sha256", secret)
//     .update(body)
//     .digest("base64");

//   await axios.post(
//     "https://checkout-api.shiprocket.com/wh/v1/custom/product",
//     body,
//     {
//       headers: {
//         "Content-Type": "application/json",
//         "X-Api-Key": apiKey,
//         "X-Api-HMAC-SHA256": hmac,
//       },
//     }
//   );
// };


// services/webhook.service.js

import {Order} from "../models/order.model.js";

export const processShiprocketWebhook = async (payload) => {
  try {

    

    

    console.log("✅ Order saved:", orderId);

    return data;
  } catch (error) {
    console.error("❌ Service Error:", error.message);
    throw error;
  }
};