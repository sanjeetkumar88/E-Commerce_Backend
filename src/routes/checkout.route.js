import { Router } from "express";
import { createCheckoutSession, shiprocketCreateOrder } from "../controllers/checkoutController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";


const router = Router();

router.route("/create-checkout-session").post(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['Checkout']
        #swagger.summary = 'Create checkout session'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            addressId: { type: "string" },
                            items: { type: "array", items: { type: "object" } }
                        }
                    }
                }
            }
        }
    */
    createCheckoutSession(req, res, next);
});

router.route("/update-status").post(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['Checkout']
        #swagger.summary = 'Update checkout status / Create Shiprocket order'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    shiprocketCreateOrder(req, res, next);
});

export default router;
