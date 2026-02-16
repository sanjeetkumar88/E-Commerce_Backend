import {Router} from "express";
import { createCheckoutSession } from "../controllers/checkoutController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const router = Router();

router.route("/create-checkout-session").post(verifyJWT, createCheckoutSession);

export default router;
