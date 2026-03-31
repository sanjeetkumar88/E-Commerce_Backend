import mongoose from "mongoose";
import { Order, OrderItem } from "../models/order.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Get paginated orders for a specific user
 */
export const getOrdersByUser = async (userId, query = {}) => {
  const {
    page = 1,
    limit = 10,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = { userId: new mongoose.Types.ObjectId(userId) };

  if (status) {
    filter.orderStatus = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Fetch order items for each order
  const orderIds = orders.map((o) => o._id);
  const allItems = await OrderItem.find({ orderId: { $in: orderIds } })
    .populate("productId", "name handle")
    .populate("variantId", "color size sku salePrice price")
    .lean();

  // Group items by orderId
  const itemsByOrder = {};
  for (const item of allItems) {
    const key = item.orderId.toString();
    if (!itemsByOrder[key]) itemsByOrder[key] = [];
    itemsByOrder[key].push(item);
  }

  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: itemsByOrder[order._id.toString()] || [],
  }));

  return {
    orders: ordersWithItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Get a single order with full details
 */
export const getOrderById = async (orderId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order ID");
  }

  const filter = { _id: orderId };

  // If userId is provided, ensure the order belongs to the user
  if (userId) {
    filter.userId = new mongoose.Types.ObjectId(userId);
  }

  const order = await Order.findOne(filter).lean();

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const items = await OrderItem.find({ orderId: order._id })
    .populate("productId", "name handle slug")
    .populate("variantId", "color size sku salePrice price imageUrl")
    .lean();

  return {
    ...order,
    items,
  };
};

/**
 * Cancel an order (user-side) — only if status is created or confirmed
 */
export const cancelOrder = async (orderId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order ID");
  }

  const order = await Order.findOne({
    _id: orderId,
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const cancellableStatuses = ["created", "confirmed"];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    throw new ApiError(
      400,
      `Cannot cancel order with status "${order.orderStatus}". Only orders with status "created" or "confirmed" can be cancelled.`
    );
  }

  order.orderStatus = "cancelled";
  order.cancelledAt = new Date();
  await order.save();

  return order;
};

/**
 * Admin: Get all orders with pagination and filters
 */
export const getAllOrders = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
  } = query;

  const filter = {};

  if (status) {
    filter.orderStatus = status;
  }
  if (paymentStatus) {
    filter.paymentStatus = paymentStatus;
  }
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { shiprocketOrderId: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("userId", "name email mobile")
      .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Fetch items for all orders
  const orderIds = orders.map((o) => o._id);
  const allItems = await OrderItem.find({ orderId: { $in: orderIds } }).lean();

  const itemsByOrder = {};
  for (const item of allItems) {
    const key = item.orderId.toString();
    if (!itemsByOrder[key]) itemsByOrder[key] = [];
    itemsByOrder[key].push(item);
  }

  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: itemsByOrder[order._id.toString()] || [],
  }));

  return {
    orders: ordersWithItems,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Admin: Update order status
 */
export const updateOrderStatus = async (orderId, status) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new ApiError(400, "Invalid order ID");
  }

  const validStatuses = [
    "created",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status "${status}". Valid statuses: ${validStatuses.join(", ")}`
    );
  }

  const updateData = { orderStatus: status };

  // Set timestamps for specific statuses
  if (status === "shipped") updateData.shippedAt = new Date();
  if (status === "delivered") updateData.deliveredAt = new Date();
  if (status === "cancelled") updateData.cancelledAt = new Date();

  const order = await Order.findByIdAndUpdate(orderId, updateData, {
    new: true,
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return order;
};
