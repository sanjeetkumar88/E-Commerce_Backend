import axios from "axios";
import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";
import {Order} from "../models/order.model.js";
import { generateHmac } from "../utils/shiprocket.js";

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


export const processShiprocketWebhook = async (payload) => {
  try {
    return payload;

  } catch (error) {
    console.error("❌ Service Error:", error.message);
    throw error;
  }
};

// services/shiprocketWebhook.service.js
export const handleShiprocketWebhookService = async (data) => {
  // const hash = crypto
  //   .createHash("sha256")
  //   .update(JSON.stringify(data))
  //   .digest("hex");

  console.log("data from webhook service", data.data);

  const hash = generateHmac(JSON.stringify(data), process.env.SHIPROCKET_API_SECRET);

  const order = await Order.findOne({
    shiprocketOrderId: data.order_id,
  });

  if (!order) throw new ApiError(404, "Order not found");

  
  if (order.lastWebhookHash === hash) return order;

  order.lastWebhookHash = hash;

  
  order.shipmentStatus = data.shipment_status;
  order.shipmentStatusCode = data.shipment_status_id;

  order.currentStatus = data.current_status;
  order.currentStatusId = data.current_status_id;

  order.currentTimestamp = new Date(data.current_timestamp);

  console.log("Updating order with shipment status:", data.current_timestamp);

  order.awb = data.awb;
  order.courier = data.courier_name;
  order.etd = data.etd ? new Date(data.etd) : null;

  //  Status mapping
  switch (data.shipment_status) {
    case "Delivered":
      order.orderStatus = "delivered";
      order.deliveredAt = new Date();
      break;

    case "Out For Delivery":
    case "In Transit":
      order.orderStatus = "shipped";
      if (!order.shippedAt) order.shippedAt = new Date();
      break;

    case "Cancelled":
      order.orderStatus = "cancelled";
      order.cancelledAt = new Date();
      break;

    case "RTO Initiated":
      order.isReturn = true;
      break;

    default:
      order.orderStatus = "processing";
  }

  // COD Payment update
  if (
    data.shipment_status === "Delivered" &&
    order.paymentType === "CASH_ON_DELIVERY"
  ) {
    order.paymentStatus = "paid";
  }

  //  Tracking timeline
  const tracking = (data.scans || []).map((scan) => ({
    status: scan.activity,
    location: scan.location,
    date: new Date(scan.date),
  }));

  order.tracking = tracking;

  order.lastWebhookAt = new Date();

  await order.save();

  return order;
};