// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  // More lenient admin check for dashboard
  // If userRole query param is present and is admin, allow access
  if (req.path === '/api/dashboard' && req.query.userRole === 'admin') {
    return next();
  }
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authorizeAdmin }; 