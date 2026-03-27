import * as dashboardService from "../services/dashboard.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * @desc  Get dashboard stats (admin only)
 * @route GET /api/v1/admin/dashboard
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData();

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Dashboard data fetched successfully"));
  } catch (error) {
    next(error);
  }
};
