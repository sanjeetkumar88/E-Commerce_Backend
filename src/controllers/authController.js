import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import timeToMs from "../utils/time.util.js";

/* -------------------------------------------------------------------------- */
/*                               COOKIE OPTIONS                                */
/* -------------------------------------------------------------------------- */

const accessTokenMaxAge = timeToMs(process.env.ACCESS_TOKEN_EXPIRY);
const refreshTokenMaxAge = timeToMs(process.env.REFRESH_TOKEN_EXPIRY); 

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

/* -------------------------------------------------------------------------- */
/*                               REGISTER (AUTO LOGIN)                         */
/* -------------------------------------------------------------------------- */

export const register = async (req, res, next) => {
  try {
    console.log(req.body);
    
    const { user, accessToken, refreshToken } = await registerUser(req.body);

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshTokenHash;

    res
      .status(201)
      .cookie("accessToken", accessToken, {
        ...baseCookieOptions,
        maxAge: accessTokenMaxAge,
      })
      .cookie("refreshToken", refreshToken, {
        ...baseCookieOptions,
        maxAge: refreshTokenMaxAge,
      })
      .json(
        new ApiResponse(201, safeUser, "Registered & logged in successfully")
      );
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   LOGIN                                    */
/* -------------------------------------------------------------------------- */

export const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await loginUser(req.body);

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.refreshTokenHash;

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...baseCookieOptions,
        maxAge: accessTokenMaxAge,
      })
      .cookie("refreshToken", refreshToken, {
        ...baseCookieOptions,
        maxAge: refreshTokenMaxAge,
      })
      .json(new ApiResponse(200, safeUser, "Login successful"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                              REFRESH TOKEN                                  */
/* -------------------------------------------------------------------------- */

export const refreshToken = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;

     if (!incomingRefreshToken) {
      throw new ApiError(401, "Refresh token missing");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshAccessToken(incomingRefreshToken);

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        ...baseCookieOptions,
        maxAge: accessTokenMaxAge,
      })
      .cookie("refreshToken", newRefreshToken, {
        ...baseCookieOptions,
        maxAge: refreshTokenMaxAge,
      })
      .json(new ApiResponse(200, null, "Access token refreshed"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   LOGOUT                                   */
/* -------------------------------------------------------------------------- */

export const logout = async (req, res, next) => {
  try {
    await logoutUser(req.user._id);

    res
      .clearCookie("accessToken", { ...baseCookieOptions, maxAge: 0 })
      .clearCookie("refreshToken", { ...baseCookieOptions, maxAge: 0 })
      .status(200)
      .json(new ApiResponse(200, null, "Logged out successfully"));
  } catch (error) {
    next(error);
  }
};
