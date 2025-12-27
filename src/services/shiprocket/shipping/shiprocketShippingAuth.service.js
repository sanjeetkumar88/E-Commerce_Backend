import axios from "axios";
import { ApiError } from "../../../utils/ApiError.js";

let shiprocketAuthToken = null;
let tokenExpiryTime = null;
let refreshPromise = null;

export const generateShipRocketAuthToken = async () => {
    // 1. Return cached token if valid
    if (
        shiprocketAuthToken &&
        tokenExpiryTime &&
        Date.now() < tokenExpiryTime.getTime()
    ) {
        return shiprocketAuthToken;
    }

    // 2. If refresh already in progress, wait for it
    if (refreshPromise) {
        return refreshPromise;
    }

    // 3. Create refresh promise
    refreshPromise = (async () => {
        try {
            const response = await axios.post(
                `${process.env.SHIPROCKET_BASEURL}/auth/login`,
                {
                    email: process.env.SHIPROCKET_EMAIL,
                    password: process.env.SHIPROCKET_PASSWORD,
                }
            );

            if (!response.data?.token) {
                throw new ApiError("Invalid Shiprocket auth response", 500);
            }

            shiprocketAuthToken = response.data.token;

            // 55 min expiry buffer
            tokenExpiryTime = new Date(Date.now() + 55 * 60 * 1000);

            return shiprocketAuthToken;
        } catch (error) {
            shiprocketAuthToken = null;
            tokenExpiryTime = null;

            throw new ApiError(
                error.response?.data?.message ||
                    "Shiprocket authentication failed",
                500
            );
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

export const getShiprocketAuthHeader = async () => {
    const token = await generateShipRocketAuthToken();

    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};
