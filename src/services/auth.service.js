import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

/* -------------------------------------------------------------------------- */
/*                                TOKEN UTILS                                 */
/* -------------------------------------------------------------------------- */

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/* -------------------------------------------------------------------------- */
/*                          GENERATE ACCESS & REFRESH                          */
/* -------------------------------------------------------------------------- */

const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store only HASH of refresh token
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

/* -------------------------------------------------------------------------- */
/*                                REGISTER USER                                */
/* -------------------------------------------------------------------------- */

export const registerUser = async ({
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
}) => {
  const existingUser = await User.findOne({
    $or: [{ email }, { phoneNumber }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
  });

  const { accessToken, refreshToken } = await generateTokens(user);

  return { user, accessToken, refreshToken };
};

/* -------------------------------------------------------------------------- */
/*                                  LOGIN USER                                 */
/* -------------------------------------------------------------------------- */

export const loginUser = async ({ email, password,phoneNumber }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account is disabled");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/* -------------------------------------------------------------------------- */
/*                           REFRESH ACCESS TOKEN                              */
/* -------------------------------------------------------------------------- */

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded._id);

  if (!user || !user.refreshTokenHash) {
    throw new ApiError(401, "Refresh token revoked");
  }

  const incomingHash = hashToken(refreshToken);

  if (incomingHash !== user.refreshTokenHash) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  // 🔁 ROTATE refresh token
  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/* -------------------------------------------------------------------------- */
/*                                  LOGOUT USER                                */
/* -------------------------------------------------------------------------- */

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(
    userId,
    { refreshTokenHash: null },
    { new: true }
  );
};
