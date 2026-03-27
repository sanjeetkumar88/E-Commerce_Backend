import mongoose from "mongoose";
import { Order, OrderItem } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";

/**
 * Get all dashboard stats for admin panel
 */
export const getDashboardData = async () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // ── Run all aggregate/count queries in parallel ──
  const [
    totalOrders,
    totalProducts,
    totalCustomers,
    revenueAgg,
    monthlyRevenueAgg,
    categoryOrderCounts,
    recentOrdersDocs,
  ] = await Promise.all([
    // 1. Total confirmed+ orders (exclude "created")
    Order.countDocuments({ orderStatus: { $ne: "created" } }),

    // 2. Total active products
    Product.countDocuments({ isDeleted: { $ne: true } }),

    // 3. Total customers
    User.countDocuments({ role: "customer", isDeleted: { $ne: true } }),

    // 4. Total revenue (sum of subtotal for confirmed+ orders)
    Order.aggregate([
      { $match: { orderStatus: { $nin: ["created", "cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$subtotal" } } },
    ]),

    // 5. Monthly revenue for current year
    Order.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["created", "cancelled"] },
          createdAt: { $gte: startOfYear },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$subtotal" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // 6. Order count per category (via OrderItems → Products)
    OrderItem.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$cat.name",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    // 7. Recent 10 orders
    Order.find({ orderStatus: { $ne: "created" } })
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // ── Format total revenue ──
  const rawRevenue = revenueAgg[0]?.total || 0;
  const totalRevenue = `₹${rawRevenue.toLocaleString("en-IN")}`;

  // ── Format monthly revenue ──
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthlyRevenue = monthNames.map((month, i) => {
    const found = monthlyRevenueAgg.find((m) => m._id === i + 1);
    return { month, revenue: found ? found.revenue : 0 };
  });

  // ── Format category data as percentages ──
  const totalCategoryCount = categoryOrderCounts.reduce(
    (sum, c) => sum + c.count,
    0
  );
  const categoryData = categoryOrderCounts.map((c) => ({
    name: c._id || "Uncategorized",
    value:
      totalCategoryCount > 0
        ? Math.round((c.count / totalCategoryCount) * 100)
        : 0,
  }));

  // ── Format recent orders for frontend table ──
  const recentOrders = recentOrdersDocs.map((order) => {
    const user = order.userId;
    const customerName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
      : "Guest";

    return {
      id: order._id,
      displayId: order.orderNumber,
      customer: customerName,
      amount: `₹${(order.subtotal || 0).toLocaleString("en-IN")}`,
      status:
        order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1),
      date: new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
  });

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    monthlyRevenue,
    categoryData,
    recentOrders,
  };
};
