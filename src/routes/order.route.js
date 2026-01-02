import express from "express";
import { createOrderController } from "../controllers/orderController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Create order
router.route("/").post(verifyJWT, createOrderController);

export default router;
