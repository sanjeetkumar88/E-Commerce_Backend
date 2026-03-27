import * as orderService from "../services/order.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @desc  Get logged-in user's orders (paginated)
 * @route GET /api/v1/orders
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await orderService.getOrdersByUser(userId, req.query);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Orders fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Get single order details
 * @route GET /api/v1/orders/:orderId
 */
export const getOrderDetails = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await orderService.getOrderById(orderId, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order details fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Cancel an order (user)
 * @route PATCH /api/v1/orders/:orderId/cancel
 */
export const cancelMyOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await orderService.cancelOrder(orderId, userId);

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order cancelled successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Admin: Get all orders (paginated, filterable)
 * @route GET /api/v1/orders/admin/all
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "All orders fetched successfully"));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc  Admin: Update order status
 * @route PATCH /api/v1/orders/admin/:orderId/status
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(orderId, status);

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order status updated successfully"));
  } catch (error) {
    next(error);
  }
};
