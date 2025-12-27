import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcrypt";

/* -------------------------------------------------------------------------- */
/*                                  READ                                      */
/* -------------------------------------------------------------------------- */

export const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password -refreshTokenHash");
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const getAllUsers = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  return await User.find()
    .skip(skip)
    .limit(limit)
    .select("-password -refreshTokenHash");
};

/* -------------------------------------------------------------------------- */
/*                                 UPDATE                                     */
/* -------------------------------------------------------------------------- */

export const updateUser = async (userId, updateData) => {
  const allowedFields = [
    "firstName",
    "lastName",
    "phoneNumber",
    "avatar",
  ];

  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([key]) =>
      allowedFields.includes(key)
    )
  );

  const user = await User.findByIdAndUpdate(userId, filteredData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshTokenHash");

  if (!user) throw new ApiError(404, "User not found");
  return user;
};

/* -------------------------------------------------------------------------- */
/*                                 DELETE                                     */
/* -------------------------------------------------------------------------- */

export const deleteUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isDeleted: true },
    { new: true }
  );

  if (!user) throw new ApiError(404, "User not found");
  return user;
};

/* -------------------------------------------------------------------------- */
/*                            CHANGE PASSWORD                                  */
/* -------------------------------------------------------------------------- */

export const changePassword = async (userId, oldPassword, newPassword) => {
  if (newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const isCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isCorrect) throw new ApiError(401, "Old password is incorrect");

  const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.refreshTokenHash = null; // logout all sessions
  await user.save();

  return true;
};
