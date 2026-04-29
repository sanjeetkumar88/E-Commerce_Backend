import dotenv from 'dotenv';
dotenv.config();

// Standard defaults for safety
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1d';
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
