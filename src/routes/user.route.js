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
router.route("/me").get(verifyJWT, getMe);

// Get user by ID (admin)
router.route("/:userId").get(verifyJWT, getUser);

// Get all users (admin)
router.route("/").get(verifyJWT, isAdmin, getUsers);

// Update my profile
router.route("/me").put(verifyJWT, updateMe);

export default router;