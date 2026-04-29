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
// ─── Admin routes (must be before /:orderId to avoid conflicts) ───
router.route("/admin/all").get((req, res, next) => {
    /*  #swagger.tags = ['Order']
        #swagger.summary = 'Get all orders (Admin)'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getAllOrders(req, res, next);
});

router.route("/admin/:orderId/status").patch((req, res, next) => {
    /*  #swagger.tags = ['Order']
        #swagger.summary = 'Update order status (Admin)'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['orderId'] = { description: 'Order ID' }
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: { type: "string" }
                        }
                    }
                }
            }
        }
    */
    updateOrderStatus(req, res, next);
});

// ─── User routes ───
router.route("/").get((req, res, next) => {
    /*  #swagger.tags = ['Order']
        #swagger.summary = 'Get my orders'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getMyOrders(req, res, next);
});

router.route("/:orderId").get((req, res, next) => {
    /*  #swagger.tags = ['Order']
        #swagger.summary = 'Get order details'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['orderId'] = { description: 'Order ID' }
    */
    getOrderDetails(req, res, next);
});

router.route("/:orderId/cancel").patch((req, res, next) => {
    /*  #swagger.tags = ['Order']
        #swagger.summary = 'Cancel my order'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['orderId'] = { description: 'Order ID' }
    */
    cancelMyOrder(req, res, next);
});

export default router;
