import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  loginUserWithPhone,
  getMeService,
} from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import timeToMs from "../utils/time.util.js";
import { isValidPhoneNumber } from "libphonenumber-js";

/* -------------------------------------------------------------------------- */
/*                               COOKIE OPTIONS                                */
/* -------------------------------------------------------------------------- */

const accessTokenMaxAge = timeToMs(process.env.ACCESS_TOKEN_EXPIRY);
const refreshTokenMaxAge = timeToMs(process.env.REFRESH_TOKEN_EXPIRY); 

// const baseCookieOptions = {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: "lax",
// };

export const baseCookieOptions = {
  httpOnly: true,
  secure: true,        
  sameSite: "none",    
  path: "/",
};

/* -------------------------------------------------------------------------- */
/*                               REGISTER (AUTO LOGIN)                         */
/* -------------------------------------------------------------------------- */

export const register = async (req, res, next) => {
  try {
    console.log(req.body);

    if (req.body.phoneNumber) {
      try {
        if (!isValidPhoneNumber(req.body.phoneNumber, "IN")) {
          throw new ApiError(400, "Invalid phone number format");
        }
      } catch (err) {
        throw new ApiError(400, "Invalid phone number format");
      }
    }
    
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
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      throw new ApiError(400, "Phone number is required");
    }

    try {
      if (!isValidPhoneNumber(phoneNumber, "IN")) {
        throw new ApiError(400, "Invalid phone number format");
      }
    } catch (err) {
      throw new ApiError(400, "Invalid phone number format");
    }

    const { user, accessToken, refreshToken } = await loginUserWithPhone(phoneNumber);

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

/* -------------------------------------------------------------------------- */
/*                                  GET ME                                    */
/* -------------------------------------------------------------------------- */

export const getMe = async (req, res, next) =>{
try {
  const user = await getMeService(req.user);
  

  return res.status(200).json(new ApiResponse(200, user, "User details fetched successfully"));
} catch (error) {
  next(error);
}
};
