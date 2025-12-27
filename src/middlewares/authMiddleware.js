import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = async (req, res, next) => {
  try {
    let token;

    // Get token from cookies
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    // Get token from Authorization header
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new ApiError(401, "Authentication required"));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new ApiError(401, "Access token expired"));
      }
      return next(new ApiError(401, "Invalid access token"));
    }

    // Find user
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return next(new ApiError(401, "User no longer exists"));
    }

    // production checks
    // if (user.isBlocked) {
    //   return next(new ApiError(403, "Account is blocked"));
    // }

    // Attach user
    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(500, "Authentication failed"));
  }
};
