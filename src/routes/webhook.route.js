
import express from "express";
import { shiprocketWebhookController } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/checkoutOrder", shiprocketWebhookController);

export default router;