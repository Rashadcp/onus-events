import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAccessToken, ITokenPayload } from '../utils/authHelper';

// Extend Express Request interface to hold authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

/**
 * Authentication Guard Middleware.
 * Protects endpoints by verifying incoming bearer JWT tokens.
 */
export function authGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header is missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    
    // Attach decoded user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired access token' });
  }
}

/**
 * Role-based Authorization Guard Middleware.
 * Restricts endpoint access to specific roles.
 * @param roles Array of authorized roles
 */
export function roleGuard(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User context not found' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges for this operation' });
    }

    next();
  };
}

/**
 * Login Rate Limiter Middleware (Anti-Brute Force).
 * Locks out IPs making too many rapid failed attempts on /login.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 5, // Limit each IP to 5 login requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.'
  }
});
