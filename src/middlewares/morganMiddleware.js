import morgan from "morgan";
import logger from "../utils/logger.js"; 

// Override the stream method so Morgan uses Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};



// Build the morgan middleware
const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms [RequestID: :id]",
  { stream }
);

morgan.token('id', (req) => req.id);

export default morganMiddleware;