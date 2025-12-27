import { addUserAddress, getUserAddresses, updateUserAddress, deleteUserAddress } from "../services/userAddress.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Add new address
export const addAddress = async (req, res, next) => {
  try {
    const userId = req.user._id; // assuming auth middleware
    const address = await addUserAddress(userId, req.body);

    res.status(201).json(new ApiResponse(201, address, "Address added successfully"));
  } catch (error) {
    next(error);
  }
};

// Get addresses by userId
export const getAddressesByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const addresses = await getUserAddresses(userId);

    res.status(200).json(new ApiResponse(200, addresses, "Addresses fetched successfully"));
  } catch (error) {
    next(error);
  }
};

// Delete address by id (only owner)
export const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user._id; // from verifyJWT middleware
    const addressId = req.params.addressId;

    const deletedAddress = await deleteUserAddress(userId, addressId);

    res
      .status(200)
      .json(new ApiResponse(200, deletedAddress, "Address deleted successfully"));
  } catch (error) {
    next(error);
  }
};

// Update address by id (only owner)
export const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user._id; // from verifyJWT middleware
    const addressId = req.params.addressId;
    const updateData = req.body;
    const updatedAddress = await updateUserAddress(userId, addressId, updateData);
    res
      .status(200)
      .json(new ApiResponse(200, updatedAddress, "Address updated successfully"));
  } catch (error) {
    next(error);
  }
};

