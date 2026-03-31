
import express from "express";
import { shiprocketOrderUpdateWebhook, shiprocketWebhookController } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/checkoutOrder", shiprocketWebhookController);

router.post("/orderUpdate", shiprocketOrderUpdateWebhook);

export default router;