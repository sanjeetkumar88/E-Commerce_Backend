import { ApiError } from "../utils/ApiError.js";

export const isAdmin = (req, res, next) => {
  try {
    // req.user should already be populated by verifyJWT
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: No user found"));
    }

    if (req.user.role !== "admin") {
      return next(new ApiError(403, "Forbidden: Admins only"));
    }

    next(); // User is admin, proceed
  } catch (error) {
    next(new ApiError(500, error.message || "Internal Server Error"));
  }
};
