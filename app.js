import "./src/config/env.js";
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ApiError } from "./src/utils/ApiError.js";
import morganMiddleware from "./src/middlewares/morganMiddleware.js";
import requestIdMiddleware from "./src/middlewares/requestId.middleware.js";
import logger from './src/utils/logger.js';
import { globalLimiter, apiReadLimiter, authLimiter, checkoutLimiter } from "./src/middlewares/rateLimiter.js";
import helmet from "helmet";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import fs from 'fs';

const swaggerFile = JSON.parse(fs.readFileSync('./swagger_output.json', 'utf-8'));

const app = express();
app.set("trust proxy", 1);

// Security Middlewares
app.use(helmet());

// Performance Middleware
app.use(compression());

app.use(requestIdMiddleware);
app.use(globalLimiter);
app.use(morganMiddleware);

app.use(cors({
  origin: ["https://oinori.in","http://localhost:8080", "https://www.oinori.in", "https://eco-mmerce-sinnora-ffff.vercel.app"],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.get("/test", (req, res) => {
  /*  #swagger.tags = ['Test']
      #swagger.summary = 'Test route'
  */
  logger.info("Checking the test route!");
  res.send("Hello World");
});



import authRoutes from "./src/routes/auth.route.js";
import userAddressRoutes from "./src/routes/userAddress.route.js";
import productRoutes from "./src/routes/product.route.js";
import categoryRoutes from "./src/routes/category.route.js";
import cartRoutes from "./src/routes/cart.route.js";
import wishlistRoutes from "./src/routes/wishlist.route.js";
import webhookRoutes from "./src/routes/webhook.route.js";
import checkoutRoutes from "./src/routes/checkout.route.js";
import orderRoutes from "./src/routes/order.route.js";
import adminRoutes from "./src/routes/admin.route.js";


app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/addresses', apiReadLimiter, userAddressRoutes);
app.use("/api/v1/products", apiReadLimiter, productRoutes);
app.use("/api/v1/categories", apiReadLimiter, categoryRoutes);
app.use("/api/v1/cart", apiReadLimiter, cartRoutes);
app.use("/api/v1/wishlist", apiReadLimiter, wishlistRoutes);
app.use("/api/v1/webhook", webhookRoutes);
app.use("/api/v1/checkout", checkoutLimiter, checkoutRoutes);
app.use("/api/v1/orders", checkoutLimiter, orderRoutes);
app.use("/api/v1/admin", adminRoutes);

// API Documentation Route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use((err, req, res, next) => {
    logger.error(`${req.method} ${req.url} [RequestID: ${req.id}] - ${err.message}`);
    if (err.statusCode === 500 || !err.statusCode) {
        logger.error(err.stack);
    }

    
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});


export default app;
