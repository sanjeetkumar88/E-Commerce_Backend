import express from "express";
import {
  addAddress,
  getAddressesByUser,
  deleteAddress,
  updateAddress,
} from "../controllers/userAddressController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Add new address
router.route("/").post(verifyJWT, addAddress);

// Get addresses for a specific user
router.route("/:userId").get(verifyJWT, getAddressesByUser);

// Delete address by id (only owner)
router.route("/delete/:addressId").delete(verifyJWT, deleteAddress);

// Update address by id (only owner)
router.route("/update/:addressId").put(verifyJWT, updateAddress);

export default router;
