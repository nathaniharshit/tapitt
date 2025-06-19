// Temporary endpoint to add 'assign_roles' permission to the admin role
// Remove this after running once for security!

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Role = mongoose.model('Role');

// Call: GET /api/fix-admin-role-permissions
router.get('/fix-admin-role-permissions', async (req, res) => {
  try {
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) return res.status(404).json({ error: 'Admin role not found' });
    if (!adminRole.permissions.includes('assign_roles')) {
      adminRole.permissions.push('assign_roles');
      await adminRole.save();
      return res.json({ message: 'assign_roles permission added to admin role.' });
    } else {
      return res.json({ message: 'Admin role already has assign_roles permission.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
