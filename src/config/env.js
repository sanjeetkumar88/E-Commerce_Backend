import dotenv from 'dotenv';
dotenv.config();

// Standard defaults for safety
process.env.ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '1d';
process.env.REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const requiredEnv = [
  'MONGODB_URI',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

if (process.env.NODE_ENV !== 'test') {
  requiredEnv.forEach((env) => {
    if (!process.env[env]) {
      console.error(`FATAL ERROR: ${env} is not defined.`);
      process.exit(1);
    }
  });
}

