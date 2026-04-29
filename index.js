import dotenv from 'dotenv';
dotenv.config();

import "./src/config/env.js"
import app from './app.js';
import connectDB from './src/config/db.js'; 

import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 8000;

let server;

connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to connect to database:', error.message);
    process.exit(1);
  });

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down server...');
  if (server) {
    server.close(() => {
      logger.info('Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

