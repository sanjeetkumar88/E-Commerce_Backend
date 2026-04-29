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
router.route("/").post(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User Address']
        #swagger.summary = 'Add new address'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string", example: "John Doe" },
                            phone: { type: "string", example: "9876543210" },
                            pincode: { type: "string", example: "110001" },
                            locality: { type: "string", example: "Sector 1" },
                            address: { type: "string", example: "Flat No 101" },
                            city: { type: "string", example: "Delhi" },
                            state: { type: "string", example: "Delhi" },
                            landmark: { type: "string", example: "Near Park" },
                            alternatePhone: { type: "string", example: "9876543211" },
                            addressType: { type: "string", example: "Home" }
                        }
                    }
                }
            }
        }
    */
    addAddress(req, res, next);
});

// Get addresses for a specific user
router.route("/:userId").get(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User Address']
        #swagger.summary = 'Get addresses for a specific user'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['userId'] = { description: 'User ID' }
    */
    getAddressesByUser(req, res, next);
});

// Delete address by id (only owner)
router.route("/delete/:addressId").delete(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User Address']
        #swagger.summary = 'Delete address by id'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['addressId'] = { description: 'Address ID' }
    */
    deleteAddress(req, res, next);
});

// Update address by id (only owner)
router.route("/update/:addressId").put(verifyJWT, (req, res, next) => {
    /*  #swagger.tags = ['User Address']
        #swagger.summary = 'Update address by id'
        #swagger.security = [{ "bearerAuth": [] }]
        #swagger.parameters['addressId'] = { description: 'Address ID' }
        #swagger.requestBody = {
            required: true,
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            phone: { type: "string" },
                            pincode: { type: "string" },
                            locality: { type: "string" },
                            address: { type: "string" },
                            city: { type: "string" },
                            state: { type: "string" },
                            landmark: { type: "string" },
                            alternatePhone: { type: "string" },
                            addressType: { type: "string" }
                        }
                    }
                }
            }
        }
    */
    updateAddress(req, res, next);
});

export default router;
