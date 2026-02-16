import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { getShiprocketProductPayload } from "../services/product.service.js";
import { syncProductToShiprocket } from "../services/webhook.service.js";

export const syncProductToShiprocketController = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // 1️ Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new ApiError(400, "Invalid product ID"));
    }

    // 2️ Generate Shiprocket formatted payload
    const payload = await getShiprocketProductPayload(productId);

    if (!payload) {
      return next(
        new ApiError(404, "Product not found or no active variants available")
      );
    }

    console.log("Generated Shiprocket Payload:", payload);

    // 3️ Call Shiprocket webhook
    const shiprocketResponse = await syncProductToShiprocket(payload);

    // 4️ Send structured response
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          productId,
          shiprocketProductId: payload.id,
          shiprocketResponse,
        },
        "Product synced successfully with Shiprocket"
      )
    );

  } catch (error) {
    return next(error);
  }
};
