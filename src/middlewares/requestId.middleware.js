import { v4 as uuidv4 } from 'uuid';

const requestIdMiddleware = (req, res, next) => {
    // Check if X-Request-ID already exists in headers, otherwise create a new one
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Attach to request object for use in controllers/services
    req.id = requestId;
    
    // Also attach to response headers for client-side tracking
    res.setHeader('X-Request-ID', requestId);
    
    next();
};

export default requestIdMiddleware;
