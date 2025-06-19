// Get all employees who are in a team led by the given manager
const express = require('express');
const router = express.Router();
const Employee = require('../server').Employee || require('mongoose').model('Employee');
const Team = require('../server').Team || require('mongoose').model('Team');

// GET /api/manager/:managerId/team-members
router.get('/manager/:managerId/team-members', async (req, res) => {
  try {
    // Find all teams where this manager is the teamLead
    const teams = await Team.find({ teamLead: req.params.managerId }).populate('members');
    // Flatten all members from all teams
    const members = teams.flatMap(team => team.members);
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
