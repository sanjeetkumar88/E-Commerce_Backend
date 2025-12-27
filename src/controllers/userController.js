import {
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  changePassword,
} from "../services/user.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/* -------------------------------------------------------------------------- */
/*                               GET MY PROFILE                                */
/* -------------------------------------------------------------------------- */

export const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.user._id);
    res.status(200).json(new ApiResponse(200, user));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               GET USER BY ID (ADMIN)                        */
/* -------------------------------------------------------------------------- */

export const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.userId);
    res.status(200).json(new ApiResponse(200, user));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               GET ALL USERS (ADMIN)                         */
/* -------------------------------------------------------------------------- */

export const getUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    const users = await getAllUsers({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    res.status(200).json(new ApiResponse(200, users));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               UPDATE PROFILE                                */
/* -------------------------------------------------------------------------- */

export const updateMe = async (req, res, next) => {
  try {
    const user = await updateUser(req.user._id, req.body);
    res.status(200).json(new ApiResponse(200, user, "Profile updated"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               DELETE USER (SOFT)                            */
/* -------------------------------------------------------------------------- */

export const removeUser = async (req, res, next) => {
  try {
    await deleteUser(req.params.userId);
    res.status(200).json(new ApiResponse(200, null, "User deleted"));
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                               CHANGE PASSWORD                               */
/* -------------------------------------------------------------------------- */

export const updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    await changePassword(req.user._id, oldPassword, newPassword);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Password updated successfully"));
  } catch (error) {
    next(error);
  }
};
