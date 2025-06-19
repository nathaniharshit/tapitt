// Custom RBAC permission-checking middleware for Express
const mongoose = require('mongoose');
const User = mongoose.model('Employee');
const Role = mongoose.model('Role');

// Usage: authorize('edit_employee')
function authorize(permission) {
  return async (req, res, next) => {
    try {
      // Assume req.user._id is set by authentication middleware
      const user = await User.findById(req.user._id).populate('roleRef');
      if (user && user.roleRef && Array.isArray(user.roleRef.permissions) && user.roleRef.permissions.includes(permission)) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

module.exports = authorize;
