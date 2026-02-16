import crypto from "crypto";

export const generateHmac = (payload, secret) => {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64");
};

let shiprocketToken = null;
let tokenExpiry = null;

export const getShiprocketToken = async () => {
  if (shiprocketToken && tokenExpiry && Date.now() < tokenExpiry) {
    return shiprocketToken;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/auth/login`,
      {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD,
      },
      { timeout: 8000 }
    );

    shiprocketToken = response.data.token;

    // Shiprocket token valid for 240 hours (usually)
    tokenExpiry = Date.now() + 1000 * 60 * 60 * 24; // 24 hours safe buffer

    return shiprocketToken;
  } catch (error) {
    console.error("Shiprocket Auth Error:", error?.response?.data || error);
    throw new ApiError(500, "Shiprocket Authentication Failed");
  }
};
