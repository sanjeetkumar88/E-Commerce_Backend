import axios from "axios";
import crypto from "crypto";

export const syncProductToShiprocket = async (payload) => {
  const apiKey = process.env.SHIPROCKET_API_KEY;
  const secret = process.env.SHIPROCKET_API_SECRET;

  console.log(apiKey, secret);

  const body = JSON.stringify(payload);

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  await axios.post(
    "https://checkout-api.shiprocket.com/wh/v1/custom/product",
    body,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-HMAC-SHA256": hmac,
      },
    }
  );
};
