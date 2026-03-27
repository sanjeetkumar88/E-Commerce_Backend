import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/adminMiddleware.js";

const router = Router();

// All admin routes require JWT + admin role
router.use(verifyJWT);
router.use(isAdmin);

router.route("/dashboard").get(getDashboard); // GET /api/v1/admin/dashboard

export default router;
