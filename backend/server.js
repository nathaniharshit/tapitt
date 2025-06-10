const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authorizeRoles = require('./middleware/rbac');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5050;

const MONGODB_URI = 'mongodb+srv://ADH:HELLO@employeemanagement.9tmhw4a.mongodb.net/?retryWrites=true&w=majority&appName=EmployeeManagement';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

const employeeSchema = new mongoose.Schema({
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  dob: String,
  city: String,
  state: String,
  zipcode: String,
  country: String,
  emergencyContact: String,
  upi: String,
  ifsc: String,
  experience: String,
  currentCompany: String,
  previousCompany: String,
  skills: String,
  linkedin: String,
  github: String,
  status: String,
  picture: String, // Store as URL or base64 string
  role: {
    type: String,
    enum: ['employee', 'admin', 'super_admin', 'superadmin', 'intern'],
    required: true
  },
  password: { type: String, select: false },
  mustChangePassword: { type: Boolean, default: true },
  department: String,      // <-- Add
  position: String,        // <-- Add
  salary: Number,          // <-- Add
  startDate: String,       // <-- Add
  address: String,         // <-- Add
  aadhar: String,          // <-- Add
  attendance: [
    {
      date: { type: String, required: true }, // YYYY-MM-DD
      status: { type: String, enum: ['present', 'absent'], required: true }
    }
  ]
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);

// --- Project Model ---
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' } // Add project lead
}, { timestamps: true });
const Project = mongoose.model('Project', projectSchema);
// --- End Project Model ---

// --- Team Model ---
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }]
}, { timestamps: true });
const Team = mongoose.model('Team', teamSchema);
// --- End Team Model ---

// --- Announcement Model ---
const announcementSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
  createdAt: { type: Date, default: Date.now }
});
const Announcement = mongoose.model('Announcement', announcementSchema);
// --- End Announcement Model ---

// --- Awards Model ---
const awardSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Employee of the Month"
  month: { type: String, required: true }, // "YYYY-MM"
  nominees: [
    {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }] // who voted for this nominee
    }
  ],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  announced: { type: Boolean, default: false }
}, { timestamps: true });
const Award = mongoose.model('Award', awardSchema);
// --- End Awards Model ---

// --- Leave Model ---
const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['Annual', 'Sick', 'Unpaid'], required: true },
  from: { type: String, required: true }, // YYYY-MM-DD
  to: { type: String, required: true },   // YYYY-MM-DD
  reason: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});
const Leave = mongoose.model('Leave', leaveSchema);
// --- End Leave Model ---

app.use(cors()); // allow all origins for now
app.use(express.json());

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Serve uploads as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const allowedFields = [
  'firstname', 'lastname', 'email', 'phone', 'dob', 'city', 'state', 'zipcode', 'country',
  'emergencyContact', 'upi', 'ifsc', 'experience', 'currentCompany', 'previousCompany', 'skills',
  'linkedin', 'github', 'status', 'picture', 'role',
  'department', 'position', 'salary', 'startDate', 'address', 'aadhar'
  // DO NOT include 'password' here
];

app.post('/api/employees', async (req, res) => {
  try {
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(400).json({ error: 'A temporary password of at least 8 characters is required.' });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const employeeData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') employeeData[field] = req.body[field];
    });
    employeeData.password = hashedPassword;
    employeeData.mustChangePassword = true;
    const employee = new Employee(employeeData);
    await employee.save();
    // Debug: log the employee with password field
    const saved = await Employee.findById(employee._id).select('+password');
    console.log('Saved employee with password:', saved);
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Projects API ---
// Get all projects (populate team members and lead)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({})
      .populate({ path: 'team', select: 'firstname lastname email role' })
      .populate({ path: 'lead', select: 'firstname lastname email role' });
    // Format team as array of IDs, and lead as ID
    const formatted = projects.map(proj => ({
      ...proj.toObject(),
      team: Array.isArray(proj.team) ? proj.team.map(member => member._id.toString()) : [],
      lead: proj.lead ? proj.lead._id.toString() : ''
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Add a new project
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, team, lead } = req.body;
    const project = new Project({
      name,
      description,
      team: Array.isArray(team) ? team : [],
      lead: lead || null
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add project' });
  }
});

// Update a project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { name, description, team, lead } = req.body;
    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        team: Array.isArray(team) ? team : [],
        lead: lead || null
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update project' });
  }
});

// Add this after the POST /api/projects endpoint
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});
// --- End Projects API ---

// --- Teams API ---
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Team.find({}).populate({ path: 'members', select: 'firstname lastname department position' });
    // Format members as array of IDs for frontend
    const formatted = teams.map(team => ({
      ...team.toObject(),
      members: Array.isArray(team.members) ? team.members.map(m => m._id.toString()) : []
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const { name, members } = req.body;
    const team = new Team({ name, members: Array.isArray(members) ? members : [] });
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create team' });
  }
});

app.put('/api/teams/:id', async (req, res) => {
  try {
    const { name, members } = req.body;
    const updated = await Team.findByIdAndUpdate(
      req.params.id,
      { name, members: Array.isArray(members) ? members : [] },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update team' });
  }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    const deleted = await Team.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});
// --- End Teams API ---

// --- Announcements API ---
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .sort({ createdAt: -1 })
      .populate({ path: 'createdBy', select: 'firstname lastname email role' });
    res.json(announcements.map(a => ({
      _id: a._id,
      message: a.message,
      createdAt: a.createdAt,
      createdBy: a.createdBy
        ? `${a.createdBy.firstname} ${a.createdBy.lastname}`
        : 'Admin'
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { message, createdBy } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    // Validate createdBy as a MongoDB ObjectId or set to null
    let createdByValue = null;
    if (createdBy && /^[a-f\d]{24}$/i.test(createdBy)) {
      createdByValue = createdBy;
    }
    const announcement = new Announcement({ message, createdBy: createdByValue });
    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add announcement' });
  }
});

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});
// --- End Announcements API ---

// --- Awards API ---

// Get all awards (for admin/super_admin: show votes, for employee: show only their votes)
app.get('/api/awards', async (req, res) => {
  try {
    // Optionally filter by month and/or award name
    const { month, name } = req.query;
    const filter = {};
    if (month) filter.month = month;
    if (name) filter.name = name;
    const awards = await Award.find(filter)
      .populate({ path: 'nominees.employee', select: 'firstname lastname department' })
      .populate({ path: 'winner', select: 'firstname lastname department' });
    res.json(awards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch awards' });
  }
});

// Nominate an employee for an award (admin/super_admin only)
app.post('/api/awards/nominate', async (req, res) => {
  try {
    const { name, month, nomineeId } = req.body;
    if (!name || !month || !nomineeId) {
      return res.status(400).json({ error: 'Award name, month, and nomineeId are required.' });
    }
    let award = await Award.findOne({ name, month });
    if (!award) {
      award = new Award({ name, month, nominees: [] });
    }
    // Prevent duplicate nomination
    if (award.nominees.some(n => n.employee.toString() === nomineeId)) {
      return res.status(400).json({ error: 'Employee already nominated.' });
    }
    award.nominees.push({ employee: nomineeId, votes: [] });
    await award.save();
    res.json({ message: 'Nomination successful', award });
  } catch (err) {
    res.status(400).json({ error: 'Failed to nominate' });
  }
});

// Vote for a nominee (any employee, one vote per award per user)
app.post('/api/awards/vote', async (req, res) => {
  try {
    const { awardId, nomineeId, voterId } = req.body;
    if (!awardId || !nomineeId || !voterId) {
      return res.status(400).json({ error: 'awardId, nomineeId, and voterId are required.' });
    }
    const award = await Award.findById(awardId);
    if (!award) return res.status(404).json({ error: 'Award not found' });
    // Remove previous vote by this voter
    award.nominees.forEach(nom => {
      nom.votes = nom.votes.filter(v => v.toString() !== voterId);
    });
    // Add vote to selected nominee
    const nominee = award.nominees.find(n => n.employee.toString() === nomineeId);
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' });
    nominee.votes.push(voterId);
    await award.save();
    res.json({ message: 'Vote recorded', award });
  } catch (err) {
    res.status(400).json({ error: 'Failed to vote' });
  }
});

// Announce winner (admin/super_admin only)
app.post('/api/awards/announce', async (req, res) => {
  try {
    const { awardId, winnerId } = req.body;
    if (!awardId || !winnerId) {
      return res.status(400).json({ error: 'awardId and winnerId are required.' });
    }
    const award = await Award.findById(awardId);
    if (!award) return res.status(404).json({ error: 'Award not found' });
    award.winner = winnerId;
    award.announced = true;
    await award.save();
    res.json({ message: 'Winner announced', award });
  } catch (err) {
    res.status(400).json({ error: 'Failed to announce winner' });
  }
});

// --- End Awards API ---

// --- Leaves API ---

// Create leave request (employee)
app.post('/api/leaves', async (req, res) => {
  try {
    const { employeeId, type, from, to, reason } = req.body;
    if (!employeeId || !type || !from || !to) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    // Validate employee exists
    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });
    const leave = new Leave({ employee: employeeId, type, from, to, reason });
    await leave.save();
    // Return leave with employeeId for frontend
    res.status(201).json({
      ...leave.toObject(),
      employeeId: leave.employee.toString()
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to request leave' });
  }
});

// Get leaves for an employee (self)
app.get('/api/leaves/:employeeId', async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.params.employeeId }).sort({ createdAt: -1 });
    // Return leaves with employeeId for frontend
    res.json(leaves.map(l => ({
      ...l.toObject(),
      employeeId: l.employee.toString()
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// Get all leaves (admin/super_admin)
app.get('/api/leaves', async (req, res) => {
  try {
    const leaves = await Leave.find({})
      .populate({ path: 'employee', select: 'firstname lastname department email' })
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all leaves' });
  }
});

// Update leave request or status (employee or admin/super_admin)
app.put('/api/leaves/:id', async (req, res) => {
  try {
    const { type, from, to, reason, employeeId, status } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });

    // Employee editing their own leave (only if Pending)
    if (employeeId && (!type || !from || !to)) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (employeeId) {
      if (leave.status !== 'Pending') return res.status(400).json({ error: 'Cannot edit leave after approval/rejection.' });
      if (leave.employee.toString() !== employeeId) return res.status(403).json({ error: 'Not authorized.' });
      leave.type = type;
      leave.from = from;
      leave.to = to;
      leave.reason = reason;
      await leave.save();
      return res.json(leave);
    }

    // Admin/super_admin updating status
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      leave.status = status;
      await leave.save();

      // If approved, mark attendance as present for each date in the leave range
      if (status === 'Approved') {
        const employee = await Employee.findById(leave.employee);
        if (employee) {
          const fromDate = new Date(leave.from);
          const toDate = new Date(leave.to);
          let current = new Date(fromDate);
          while (current <= toDate) {
            const dateStr = current.toISOString().slice(0, 10);
            if (!Array.isArray(employee.attendance)) employee.attendance = [];
            if (!employee.attendance.some(a => a.date === dateStr)) {
              employee.attendance.push({ date: dateStr, status: 'present' });
            }
            current.setDate(current.getDate() + 1);
          }
          await employee.save();
        }
      }
      return res.json(leave);
    }

    return res.status(400).json({ error: 'Invalid request.' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update leave' });
  }
});

// Delete leave request (employee can delete only if status is Pending)
app.delete('/api/leaves/:id', async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    // Only allow delete if status is Pending and employee matches
    if (leave.status !== 'Pending') return res.status(400).json({ error: 'Cannot delete leave after approval/rejection.' });
    // Optionally, check employee identity here if needed
    await leave.deleteOne();
    res.json({ message: 'Leave deleted.' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete leave' });
  }
});

// --- End Leaves API ---

// --- Employees API: filter by role for team selection ---
app.get('/api/employees', async (req, res) => {
  try {
    let filter = {};
    // Support ?roles=employee,intern for team selection
    if (req.query.roles) {
      const roles = req.query.roles.split(',');
      filter.role = { $in: roles };
    }
    // Explicitly select createdAt and updatedAt fields
    const employees = await Employee.find(filter).select('+createdAt +updatedAt');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update employee with file upload
app.put('/api/employees/:id', upload.fields([
  { name: 'picture', maxCount: 1 }
]), async (req, res) => {
  try {
    let updateData = {};
    // If multipart/form-data, req.body fields are strings
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') updateData[field] = req.body[field];
    });
    // If a profile picture was uploaded, set the picture field to the file URL
    if (req.files && req.files['picture']) {
      updateData.picture = `/uploads/${req.files['picture'][0].filename}`;
    }
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') updateData[key] = undefined;
    });
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(updatedEmployee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  console.log('Delete request for id:', req.params.id); // Debug log
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
    if (!deletedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const employee = await Employee.findOne({ email }).select('+password +mustChangePassword +firstname +lastname +role +lastLogin');
    // Debug: log the employee password hash
    if (employee) {
      console.log('Employee password hash in DB:', employee.password);
    }
    if (!employee) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!employee.password) {
      return res.status(403).json({ error: 'Password not set', employeeId: employee._id });
    }
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Update lastLogin timestamp
    employee.lastLogin = new Date();
    await employee.save();
    // Return mustChangePassword flag for frontend
    res.json({ message: 'Login successful', employee: {
      _id: employee._id,
      email: employee.email,
      role: employee.role,
      mustChangePassword: employee.mustChangePassword,
      firstname: employee.firstname,
      lastname: employee.lastname,
      lastLogin: employee.lastLogin
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees/:id/set-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword, mustChangePassword: false },
      { new: true, runValidators: true }
    );
    if (!updatedEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Password set successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Clock-in endpoint
app.post('/api/employees/:id/clockin', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { clockInTime: new Date(), clockOutTime: undefined },
      { new: true }
    );
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Clocked in', clockInTime: employee.clockInTime });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Clock-out endpoint
app.post('/api/employees/:id/clockout', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { clockOutTime: new Date() },
      { new: true }
    );
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Clocked out', clockOutTime: employee.clockOutTime });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Middleware to mark attendance on login
app.use(async (req, res, next) => {
  // Add this to mark attendance on login
  if (req.path === '/api/login' && req.method === 'POST') {
    // After successful login, mark today's attendance
    const { email } = req.body;
    try {
      const employee = await Employee.findOne({ email });
      if (employee) {
        const today = new Date();
        const dateStr = today.toISOString().substring(0, 10); // YYYY-MM-DD
        if (!employee.attendance) employee.attendance = [];
        // Only add if not already present for that date
        if (!employee.attendance.some(a => (typeof a === 'object' && a.date === dateStr) || a === dateStr)) {
          employee.attendance.push({ date: dateStr, status: 'present' });
          await employee.save();
        }
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  }
  next();
});

// Mark attendance for an employee (admin/super_admin only)
app.post('/api/employees/:id/attendance', async (req, res) => {
  try {
    const { date, status } = req.body;
    if (!date || !['present', 'absent'].includes(status)) {
      return res.status(400).json({ error: 'Date and valid status are required.' });
    }
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Prevent marking attendance if already marked for that date
    if ((employee.attendance || []).some(a => a.date === date)) {
      return res.status(400).json({ error: 'Attendance already marked for this date.' });
    }

    // Add new attendance record
    employee.attendance = employee.attendance || [];
    employee.attendance.push({ date, status });
    await employee.save();
    res.json({ message: 'Attendance marked', attendance: employee.attendance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get attendance for an employee
app.get('/api/employees/:id/attendance', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).select('attendance');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json({ attendance: employee.attendance || [] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add this endpoint before app.listen
app.get('/api/employees/roles-count', async (req, res) => {
  try {
    const counts = await Employee.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    // Convert to { super_admin: X, admin: Y, employee: Z }
    const result = { super_admin: 0, admin: 0, employee: 0 };
    counts.forEach(item => {
      if (item._id === 'super_admin' || item._id === 'superadmin') result.super_admin = item.count;
      else if (item._id === 'admin') result.admin = item.count;
      else if (item._id === 'employee') result.employee = item.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this endpoint before app.listen
app.post('/api/fix-attendance-format', async (req, res) => {
  try {
    const employees = await Employee.find({});
    let fixedCount = 0;
    for (const emp of employees) {
      let changed = false;
      if (Array.isArray(emp.attendance)) {
        emp.attendance = emp.attendance.map(a => {
          if (typeof a === 'string') {
            changed = true;
            return { date: a, status: 'present' };
          }
          return a;
        });
        if (changed) {
          await emp.save();
          fixedCount++;
        }
      }
    }
    res.json({ message: `Fixed attendance format for ${fixedCount} employees.` });
  } catch (err) {
    res.status(500).json({ error: 'Migration failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
