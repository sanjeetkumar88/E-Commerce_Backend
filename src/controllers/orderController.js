import { createOrder } from "../services/order.service.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Create Order Controller
 * @route POST /api/orders
 * @body { userId, items, shippingAddressId, billingAddressId, orderData }
 */
export const createOrderController = async (req, res, next) => {
  try {
    const { userId, items, shippingAddressId, billingAddressId, orderData } = req.body;

    if (!userId || !items?.length || !shippingAddressId || !billingAddressId || !orderData) {
      throw new ApiError(400, "Missing required fields");
    }

    const result = await createOrder({
      userId,
      items,
      shippingAddressId,
      billingAddressId,
      orderData,
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
