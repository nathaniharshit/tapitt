// Permission-based RBAC middleware
// Usage: authorizePermission('edit_employee')
const mongoose = require('mongoose');
const Role = mongoose.model('Role'); // Assumes Role model is registered

module.exports = function authorizePermission(permission) {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: no user' });
    }
    // If user has roleRef populated with permissions
    let permissions = [];
    if (user.roleRef && user.roleRef.permissions) {
      permissions = user.roleRef.permissions;
    } else if (user.roleRef) {
      // If only roleRef ID is present, populate it
      const role = await Role.findById(user.roleRef);
      if (role && role.permissions) permissions = role.permissions;
    }
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permission' });
    }
    next();
  };
};
