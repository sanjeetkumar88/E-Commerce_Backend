
import express from "express";
import { shiprocketOrderUpdateWebhook, shiprocketWebhookController } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/checkoutOrder", (req, res, next) => {
    /*  #swagger.tags = ['Webhook']
        #swagger.summary = 'Shiprocket checkout order webhook'
    */
    shiprocketWebhookController(req, res, next);
});

router.post("/orderUpdate", (req, res, next) => {
    /*  #swagger.tags = ['Webhook']
        #swagger.summary = 'Shiprocket order update webhook'
    */
    shiprocketOrderUpdateWebhook(req, res, next);
});

export default router;