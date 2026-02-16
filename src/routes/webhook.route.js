import express from "express";
import { syncProductToShiprocketController } from "../controllers/webhookController.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.post(
  "/sync/product/:productId",
  verifyJWT,
  isAdmin,
  syncProductToShiprocketController,
);



export default router;
