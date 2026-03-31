import mongoose from "mongoose";


// controllers/webhook.controller.js

import { processShiprocketWebhook, handleShiprocketWebhookService  } from "../services/webhook.service.js";

export const shiprocketWebhookController = async (req, res, next) => {
  try {
    console.log(" Webhook received");

    const apiKey = req.headers["x-api-key"];
    if (apiKey && apiKey !== "mysecret123") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = req.body;

    console.log("Payload:", payload);

    await processShiprocketWebhook(payload);

    //  VERY IMPORTANT (Shiprocket expects 200)
    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });

  } catch (error) {
    next(error);
    return res.status(500).json({
      success: false,
      message: "Webhook failed",
    });
  }
};

export const shiprocketOrderUpdateWebhook = async (req, res, next) => {
  try {

    // const apiKey = req.headers["x-api-key"];
    // if (apiKey && apiKey !== "mysecret123") {
    //   return res.status(401).json({ message: "Unauthorized" });
    // }

    const data = req.body;

    console.log("📩 Shiprocket Webhook Received:", data);

    await handleShiprocketWebhookService(data);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
    res.status(200).json({ success: false });
  }
};
