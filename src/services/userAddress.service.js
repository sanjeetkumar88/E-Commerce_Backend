import { UserAddress } from "../models/userAddress.model.js";
import { ApiError } from "../utils/ApiError.js";

/* -------------------------------------------------------------------------- */
/*                           ADD NEW ADDRESS                                   */
/* -------------------------------------------------------------------------- */
export const addUserAddress = async (userId, addressData) => {
  // If isDefault is true, unset other default addresses for this user
  if (addressData.isDefault) {
    await UserAddress.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  const address = await UserAddress.create({
    userId,
    ...addressData,
  });

  return address;
};

/* -------------------------------------------------------------------------- */
/*                       GET ADDRESSES BY USER ID                              */
/* -------------------------------------------------------------------------- */
export const getUserAddresses = async (userId) => {
  const addresses = await UserAddress.find({ userId }).sort({ createdAt: -1 });

  if (!addresses || addresses.length === 0) {
    throw new ApiError(404, "No addresses found for this user");
  }

  return addresses;
};

/* -------------------------------------------------------------------------- */
/*                         DELETE ADDRESS BY ID                                */
/* -------------------------------------------------------------------------- */
export const deleteUserAddress = async (userId, addressId) => {
  const address = await UserAddress.findOne({ _id: addressId, userId });

  if (!address) {
    throw new ApiError(404, "Address not found or not authorized");
  }

  await address.deleteOne();
  return address;
};

export const updateUserAddress = async (userId, addressId, updateData) => {
  // If setting as default, unset other defaults
  if (updateData.isDefault) {
    await UserAddress.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  const address = await UserAddress.findOneAndUpdate(
    { _id: addressId, userId },
    { $set: updateData },
    { new: true }
  );

  if (!address) {
    throw new ApiError(404, "Address not found or not authorized");
  }

  return address;
};
