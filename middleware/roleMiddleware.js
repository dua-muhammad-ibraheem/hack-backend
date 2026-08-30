// Restricts a route to specific roles.
// Must be used AFTER authMiddleware (needs req.user.role to already be set).
// Usage: router.get('/worker', authMiddleware, roleMiddleware('worker'), handler)

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: "Access denied. No user found on request.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission for this action.",
      });
    }

    next();
  };
};

module.exports = roleMiddleware;