import { Router } from "express";
import {
  getMyOrders,
  getOrderDetails,
  cancelMyOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// All order routes require authentication
router.use(verifyJWT);

// ─── Admin routes (must be before /:orderId to avoid conflicts) ───
router.route("/admin/all").get(getAllOrders);                    // GET  /api/v1/orders/admin/all
router.route("/admin/:orderId/status").patch(updateOrderStatus); // PATCH /api/v1/orders/admin/:orderId/status

// ─── User routes ───
router.route("/").get(getMyOrders);                             // GET   /api/v1/orders
router.route("/:orderId").get(getOrderDetails);                 // GET   /api/v1/orders/:orderId
router.route("/:orderId/cancel").patch(cancelMyOrder);          // PATCH /api/v1/orders/:orderId/cancel

export default router;
