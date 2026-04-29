import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartQuantity,
  removeCartItem,
  mergeGuestCart,
  clearCart,
} from "../controllers/cartController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Secure all cart routes
router.use(verifyJWT);

router.route("/").get((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Get user cart'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getCart(req, res, next);
}).post((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Add item to cart'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            productId: { type: "string" },
                            variantId: { type: "string" },
                            quantity: { type: "number" }
                        }
                    }
                }
            }
        }
    */
    addToCart(req, res, next);
});

router.route("/merge").post((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Merge guest cart with user cart'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    mergeGuestCart(req, res, next);
});

router.route("/clear").delete((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Clear user cart'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    clearCart(req, res, next);
});

router.route("/remove/:cartItemId").delete((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Remove item from cart'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['cartItemId'] = { description: 'Cart Item ID' }
    */
    removeCartItem(req, res, next);
});

router.route("/update/:cartItemId").patch((req, res, next) => {
    /*  #swagger.tags = ['Cart']
        #swagger.summary = 'Update cart item quantity'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['cartItemId'] = { description: 'Cart Item ID' }
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            quantity: { type: "number" }
                        }
                    }
                }
            }
        }
    */
    updateCartQuantity(req, res, next);
});

export default router; 