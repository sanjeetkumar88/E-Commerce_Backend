import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware to validate request data against a schema
 * @param {Object} schema - Validation schema (can be Zod, Joi, or custom)
 * @returns {Function} Middleware function
 */
export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      // Basic validation logic (can be extended with a library later)
      const bodyErrors = [];
      Object.keys(schema.body).forEach(key => {
        if (schema.body[key].required && !req.body[key]) {
          bodyErrors.push(`${key} is required`);
        }
      });
      if (bodyErrors.length > 0) {
        throw new ApiError(400, "Validation failed", bodyErrors);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};
