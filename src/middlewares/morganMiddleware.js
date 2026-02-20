import morgan from "morgan";
import logger from "../utils/logger.js"; 

// Override the stream method so Morgan uses Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging during tests or you can skip specific paths (like health checks)
const skip = () => {
  const env = process.env.NODE_ENV || "development";
  return env !== "development";
};

// Build the morgan middleware
const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip }
);

export default morganMiddleware;