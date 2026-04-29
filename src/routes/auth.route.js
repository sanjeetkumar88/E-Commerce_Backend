import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getMe,
} from "../controllers/authController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

router.route("/register").post((req, res, next) => {
    /*  #swagger.tags = ['Authentication']
        #swagger.summary = 'Register a new user'
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            phone: { type: "string", example: "9876543210" },
                            name: { type: "string", example: "John Doe" }
                        }
                    }
                }
            }
        }
    */
    register(req, res, next);
});

router.route("/login").post((req, res, next) => {
    /*  #swagger.tags = ['Authentication']
        #swagger.summary = 'Login via phone number'
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        required: ["phone"],
                        properties: {
                            phone: { type: "string", example: "9876543210" }
                        }
                    }
                }
            }
        }
    */
    login(req, res, next);
});

router.route("/refresh-token").post((req, res, next) => {
    /*  #swagger.tags = ['Authentication']
        #swagger.summary = 'Refresh access token'
        #swagger.description = 'Refresh access token using refresh token from cookies'
    */
    refreshToken(req, res, next);
});

router.route("/logout").post(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['Authentication']
        #swagger.summary = 'Logout user'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    logout(req, res, next);
});

router.route("/me").get(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['Authentication']
        #swagger.summary = 'Get current user profile'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getMe(req, res, next);
});

export default router;
