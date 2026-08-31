const jwt = require('jsonwebtoken');

/**
 * Middleware that validates a Bearer JWT and attaches req.userId.
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Invalid token.',
    });
  }
};

/**
 * Middleware that restricts access to users with specific roles.
 * @param {string[]} allowedRoles - Array of roles allowed to access the route.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User role not found.',
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role ${req.userRole} is not authorized to access this resource.`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
