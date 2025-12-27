class ApiError extends Error {
    /**
     * Custom API Error
     * @param {number} statusCode - HTTP status code
     * @param {string} message - Error message
     * @param {Array} errors - Array of validation or additional errors
     * @param {any} data - Optional extra data to send
     * @param {string} stack - Optional stack trace
     */
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        data = null,
        stack = ""
    ) {
        super(message);

        this.statusCode = statusCode;
        this.success = false;
        this.message = message;
        this.errors = errors;
        this.data = data;

        // Capture stack only if not provided and not in production
        if (stack) {
            this.stack = stack;
        } else if (process.env.NODE_ENV !== "production") {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = undefined; // Do not expose stack in production
        }
    }
}

export { ApiError };
