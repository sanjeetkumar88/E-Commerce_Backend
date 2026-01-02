import axios from "axios";
import { getShiprocketAuthHeader } from "./shiprocketShippingAuth.service.js";
import { ApiError } from "../../../utils/ApiError.js";

let cachedCategories = null;

/**
 * Fetch Shiprocket categories (with caching)
 */
export const getShiprocketCategories = async () => {
  if (cachedCategories) return cachedCategories;

  try {
    const headers = await getShiprocketAuthHeader();

    const res = await axios.get(
      `${process.env.SHIPROCKET_BASEURL}/categories`,
      { headers }
    );

    cachedCategories = res.data.data; // Array of {id, name}
    return cachedCategories;
  } catch (error) {
    console.error("❌ Shiprocket categories fetch failed", error.message);
    throw new ApiError(500, "Failed to fetch Shiprocket categories");
  }
};

/**
 * Map your internal category to Shiprocket category ID
 */
export const mapCategoryToShiprocket = async (internalCategoryName) => {
  const categories = await getShiprocketCategories();

  const match = categories.find(
    (c) => c.name.toLowerCase() === internalCategoryName.toLowerCase()
  );

  if (!match) {
    throw new ApiError(
      400,
      `No Shiprocket category found for '${internalCategoryName}'`
    );
  }

  return match.id;
};
