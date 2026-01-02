import axios from "axios";
import { ApiError } from "../../../utils/ApiError.js";
import { getShiprocketAuthHeader } from "./shiprocketShippingAuth.service.js";

export const createShiprocketProduct = async ({ product }) => {
  try {
    const headers = await getShiprocketAuthHeader();

    if (!product.category_code) {
      throw new ApiError(400, "Shiprocket category code missing");
    }

    
    const payload = {
      name: product.name,
      sku: product.sku,
      type: "Single", // ✅ Always Single for Shiprocket
      category_code: product.category_code,
      brand: product.brand || "Generic",
      weight: product.weight || 0.5,
      description: product.description || "",
      qty: product.stockQuantity ?? 0,
      mrp: product.salePrice ?? product.price,
      size: product.size || "",
      color: product.color || "",
      product_image: product.image_url || "",
    };

    console.log("📦 Shiprocket Payload:", JSON.stringify(payload, null, 2));

    const res = await axios.post(
      `${process.env.SHIPROCKET_BASEURL}/products`,
      payload,
      { headers }
    );

    return res.data.data;
  } catch (error) {
    console.error("❌ Shiprocket Product Create Failed");

    if (error.response) {
      console.error("STATUS:", error.response.status);
      console.error("DATA:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("ERROR:", error.message);
    }

    throw new ApiError(500, "Shiprocket product creation failed");
  }
};
