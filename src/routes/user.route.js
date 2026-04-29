import express from "express";
import {
    getMe,
    getUser,
    getUsers,
    updateMe,
} from "../controllers/userController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware";

const router = express.Router();

// Get my profile
router.route("/me").get(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User']
        #swagger.summary = 'Get my profile'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getMe(req, res, next);
});

// Get user by ID (admin)
router.route("/:userId").get(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User Admin']
        #swagger.summary = 'Get user by ID'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['userId'] = { description: 'User ID' }
    */
    getUser(req, res, next);
});

// Get all users (admin)
router.route("/").get(verifyJWT, isAdmin, (req, res, next) => {
    /*  #swagger.tags = ['User Admin']
        #swagger.summary = 'Get all users'
        #swagger.security = [{ "bearerAuth": [] }]
    */
    getUsers(req, res, next);
});

// Update my profile
router.route("/me").put(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User']
        #swagger.summary = 'Update my profile'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            email: { type: "string" }
                        }
                    }
                }
            }
        }
    */
    updateMe(req, res, next);
});

export default router;