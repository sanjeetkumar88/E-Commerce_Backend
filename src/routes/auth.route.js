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

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register user & auto-login
 * @access  Public
 */
router.route("/register").post(register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.route("/login").post(login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token cookie
 * @access  Public (cookie-based)
 */
router.route("/refresh-token").post(refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.route("/logout").post(verifyJWT, logout);


router.route("/me").get(verifyJWT, getMe);

export default router;
