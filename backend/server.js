const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const PORT = process.env.PORT || 5050;

const MONGODB_URI = 'mongodb+srv://ADH:HELLO@employeemanagement.9tmhw4a.mongodb.net/?retryWrites=true&w=majority&appName=EmployeeManagement';

const sessionSchema = new mongoose.Schema({
  employeeId: String,
  employeeName: String,
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null } // Add endTime for session end
});
const Session = mongoose.model('Session', sessionSchema);

// Add express.json() middleware at the very top, before any routes
app.use(express.json());

app.post('/api/session/start', async (req, res) => {
  // Log the raw body for debugging
  console.log('Raw req.body:', req.body);
  const { employeeName, employeeId } = req.body || {};

  // Log the request body and employeeId for debugging
  console.log('Session start request body:', req.body);

  try {
    // Save session to database
    const session = new Session({
      employeeId: employeeId,
      employeeName: employeeName,
      startTime: new Date(),
    });
    await session.save();
    console.log('Session saved:', session);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ success: false, error: 'Failed to save session', details: error.message });
  }
});

// Endpoint to end a session (set endTime for the latest open session)
app.post('/api/session/end', async (req, res) => {
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
  try {
    // Find the latest session for this employee with no endTime
    const session = await Session.findOne({ employeeId, endTime: null }).sort({ startTime: -1 });
    if (!session) return res.status(404).json({ error: 'No active session found' });
    session.endTime = new Date();
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to end session', details: error.message });
  }
});

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    // Initialize default standard payroll items
    await initializeStandardPayroll();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true }, // <-- Ensure this line exists
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
  role: String,
  picture: String, // Store as URL or base64 string
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
  ],
  allowances: {
    type: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    default: undefined
  },
  deductions: {
    type: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],
    default: undefined
  },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null } // <-- Add
}, { timestamps: true });

// Add remoteWork field to employee schema if not present
if (!employeeSchema.paths.remoteWork) {
  employeeSchema.add({
    remoteWork: [{ type: String }] // Array of YYYY-MM-DD strings
  });
}

// Add remoteWorkRequests field to employee schema if not present
if (!employeeSchema.paths.remoteWorkRequests) {
  employeeSchema.add({
    remoteWorkRequests: [{ type: String }] // Array of YYYY-MM-DD strings (pending requests)
  });
}

// Add remoteWorkApprovals field to employee schema if not present
if (!employeeSchema.paths.remoteWorkApprovals) {
  employeeSchema.add({
    remoteWorkApprovals: [{
      date: String, // YYYY-MM-DD
      approver: String, // 'admin', 'hr', etc.
      approverName: String // Optional: store name
    }]
  });
}

// --- Role Model for Custom RBAC ---
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [String], // e.g., ['edit_employee', 'view_payroll']
});
const Role = mongoose.model('Role', roleSchema);

// Update Employee schema to reference Role
employeeSchema.add({
  roleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
});

const Employee = mongoose.model('Employee', employeeSchema);

// --- Project Model ---
const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  status: { type: String, enum: ['active', 'over'], default: 'active' } // <-- Add status field
}, { timestamps: true });
const Project = mongoose.model('Project', projectSchema);
// --- End Project Model ---

// --- Team Model ---
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' } // Assigned by admin/HR
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

// --- Scheduled Report Model ---
const scheduledReportSchema = new mongoose.Schema({
  type: { type: String, required: true },
  date: { type: Date, required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
const ScheduledReport = mongoose.model('ScheduledReport', scheduledReportSchema);
// --- End Scheduled Report Model ---

// Now require middleware (after models are registered, before any routes)
const authorizeRoles = require('./middleware/rbac');
const authorizePermission = require('./middleware/permission');

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
  'employeeId', // <-- Add this line at the top
  'firstname', 'lastname', 'email', 'phone', 'dob', 'city', 'state', 'zipcode', 'country',
  'emergencyContact', 'upi', 'ifsc', 'experience', 'currentCompany', 'previousCompany', 'skills',
  'linkedin', 'github', 'status', 'picture', 'role',
  'department', 'position', 'salary', 'startDate', 'address', 'aadhar',
  'allowances', 'deductions', // <-- Add allowances and deductions
  'reportingManager' // <-- Add this line
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
    
    // Get standard allowances and deductions and assign to new employee
    const standardPayroll = await getStandardPayrollItems();
    employeeData.allowances = standardPayroll.allowances;
    employeeData.deductions = standardPayroll.deductions;
    
    console.log('Assigning standard payroll to new employee:', {
      allowances: standardPayroll.allowances,
      deductions: standardPayroll.deductions
    });
    
    const employee = new Employee(employeeData);
    await employee.save();
    
    // Debug: log the employee with password field
    const saved = await Employee.findById(employee._id).select('+password');
    console.log('Saved employee with password and payroll:', saved);
    
    res.status(201).json(employee);
  } catch (err) {
    console.error('Error creating employee:', err);
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
    // Accept status field for project completion
    const { name, description, team, lead, status } = req.body;
    const updateObj = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(team !== undefined && { team: Array.isArray(team) ? team : [] }),
      ...(lead !== undefined && { lead: lead || null }),
      ...(status !== undefined && { status })
    };
    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      updateObj,
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

// Get all awards (for admin/superadmin: show votes, for employee: show only their votes)
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

// Nominate an employee for an award (admin/superadmin only)
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

// Announce winner (admin/superadmin only)
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

// Get all leaves (admin/superadmin)
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

// Update leave request or status (employee or admin/superadmin)
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

    // Admin/superadmin updating status
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

// --- Employees API: filter by role for team selection ---
app.get('/api/employees', async (req, res) => {
  try {
    let filter = {};
    // Support ?roles=employee,intern for team selection
    if (req.query.roles) {
      const roles = req.query.roles.split(',');
      filter.role = { $in: roles };
    }
    // Support ?remoteDate=YYYY-MM-DD to filter employees working remotely on that date
    if (req.query.remoteDate) {
      const remoteDate = req.query.remoteDate;
      // Find employees who are remote or have a pending remote request for the date
      const remoteEmployees = await Employee.find({
        ...filter,
        remoteWork: remoteDate
      }).select('+createdAt +updatedAt');
      const pendingRemoteRequests = await Employee.find({
        ...filter,
        remoteWorkRequests: remoteDate
      }).select('+createdAt +updatedAt');
      return res.json({
        remoteEmployees,
        pendingRemoteRequests
      });
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
  const { email, employeeId, password } = req.body;
  
  // Accept either email or employeeId for login, but prioritize employeeId
  const loginField = employeeId || email;
  if (!loginField || !password) {
    return res.status(400).json({ error: 'Employee ID and password are required' });
  }
  
  try {
    // Try to find employee by employeeId first (since that's what employees/interns use)
    let employee = await Employee.findOne({ employeeId: loginField }).select('+password +mustChangePassword +firstname +lastname +role +lastLogin');
    
    // If not found by employeeId and an email was provided, try by email (for backwards compatibility)
    if (!employee && email) {
      employee = await Employee.findOne({ email: loginField }).select('+password +mustChangePassword +firstname +lastname +role +lastLogin');
    }
    
    console.log('Login attempt with:', loginField);
    console.log('Employee found:', employee ? `${employee.firstname} ${employee.lastname} (${employee.employeeId})` : 'None');
    if (employee) {
      console.log('Employee has password set:', !!employee.password);
    }
    if (!employee) {
      return res.status(401).json({ error: 'Invalid employee ID or password' });
    }
    if (!employee.password) {
      return res.status(403).json({ error: 'Password not set', employeeId: employee._id });
    }
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      console.log('Password comparison failed for employee:', employee.employeeId);
      return res.status(401).json({ error: 'Invalid employee ID or password' });
    }
    // Update lastLogin timestamp
    employee.lastLogin = new Date();
    await employee.save();
    // Populate roleRef for permissions-based RBAC
    const employeeWithRole = await Employee.findById(employee._id).populate('roleRef');
    res.json({ message: 'Login successful', employee: {
      _id: employee._id,
      email: employee.email,
      role: employee.role,
      mustChangePassword: employee.mustChangePassword,
      firstname: employee.firstname,
      lastname: employee.lastname,
      lastLogin: employee.lastLogin,
      roleRef: employeeWithRole.roleRef // includes name and permissions
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

// Mark employee as working remotely for a date
app.post('/api/employees/:id/remote', async (req, res) => {
  try {
    const { date } = req.body;
    console.log('Mark remote request:', { id: req.params.id, date });
    if (!date) {
      console.error('Remote mark failed: Date is required.');
      return res.status(400).json({ error: 'Date is required.' });
    }
    const emp = await Employee.findById(req.params.id);
    if (!emp) {
      console.error('Remote mark failed: Employee not found for id', req.params.id);
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (!Array.isArray(emp.remoteWork)) emp.remoteWork = [];
    if (emp.remoteWork.includes(date)) {
      console.warn('Remote mark failed: Already marked as remote for this date.', { id: req.params.id, date });
      return res.status(400).json({ error: 'Already marked as remote for this date.' });
    }
    emp.remoteWork.push(date);
    await emp.save();
    console.log('Remote mark success:', { id: req.params.id, date });
    res.json({ message: 'Marked as remote', remoteWork: emp.remoteWork });
  } catch (err) {
    console.error('Remote mark failed:', err);
    res.status(400).json({ error: 'Failed to mark remote', details: err.message });
  }
});

// Employee requests remote work for a date (creates a pending request)
app.post('/api/employees/:id/remote-request', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!Array.isArray(emp.remoteWorkRequests)) emp.remoteWorkRequests = [];
    if (emp.remoteWorkRequests.includes(date) || (Array.isArray(emp.remoteWork) && emp.remoteWork.includes(date))) {
      return res.status(400).json({ error: 'Already requested or marked as remote for this date.' });
    }
    emp.remoteWorkRequests.push(date);
    await emp.save();
    res.json({ message: 'Remote work request submitted', remoteWorkRequests: emp.remoteWorkRequests });
  } catch (err) {
    res.status(400).json({ error: 'Failed to request remote work', details: err.message });
  }
});

// Admin approves remote work request (moves date from requests to remoteWork)
app.post('/api/employees/:id/remote-approve', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!Array.isArray(emp.remoteWorkRequests) || !emp.remoteWorkRequests.includes(date)) {
      return res.status(400).json({ error: 'No such remote work request.' });
    }
    // Remove from requests, add to remoteWork
    emp.remoteWorkRequests = emp.remoteWorkRequests.filter(d => d !== date);
    if (!Array.isArray(emp.remoteWork)) emp.remoteWork = [];
    emp.remoteWork.push(date);
    // Add approval record
    if (!Array.isArray(emp.remoteWorkApprovals)) emp.remoteWorkApprovals = [];
    if (req.user) {
      emp.remoteWorkApprovals.push({
        date,
        approver: req.user.role,
        approverName: req.user.firstname + ' ' + req.user.lastname
      });
    }
    await emp.save();
    // Emit socket event for real-time update
    if (global._io) {
      global._io.emit('remoteRequestApproved', {
        employeeId: emp._id.toString(),
        date,
        approver: req.user ? req.user.role : undefined,
        approverName: req.user ? req.user.firstname + ' ' + req.user.lastname : undefined
      });
    }
    res.json({ message: 'Remote work approved', remoteWork: emp.remoteWork });
  } catch (err) {
    res.status(400).json({ error: 'Failed to approve remote work', details: err.message });
  }
});

// Admin cancels remote work request (removes date from requests)
app.post('/api/employees/:id/remote-cancel', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required.' });
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!Array.isArray(emp.remoteWorkRequests) || !emp.remoteWorkRequests.includes(date)) {
      return res.status(400).json({ error: 'No such remote work request.' });
    }
    emp.remoteWorkRequests = emp.remoteWorkRequests.filter(d => d !== date);
    await emp.save();
    res.json({ message: 'Remote work request cancelled', remoteWorkRequests: emp.remoteWorkRequests });
  } catch (err) {
    res.status(400).json({ error: 'Failed to cancel remote work request', details: err.message });
  }
});

// Middleware to mark attendance on login
app.use(async (req, res, next) => {
  // Add this to mark attendance on login
  if (req.path === '/api/login' && req.method === 'POST') {
    // After successful login, mark today's attendance
    const { email, employeeId } = req.body;
    const loginField = employeeId || email; // Prioritize employeeId
    try {
      // Find employee by employeeId first, then by email if provided
      let employee = await Employee.findOne({ employeeId: loginField });
      if (!employee && email) {
        employee = await Employee.findOne({ email: loginField });
      }
      
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

// Mark attendance for an employee (admin/superadmin only)
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

// --- Reports API ---
const { Parser } = require('json2csv');

// Helper to generate a table in PDF
function addTable(doc, headers, rows) {
  doc.font('Helvetica-Bold').fontSize(12);
  // Print headers
  headers.forEach((header, i) => {
    doc.text(header, { continued: i < headers.length - 1, width: 120 });
  });
  doc.moveDown();
  doc.font('Helvetica').fontSize(10);
  // Print rows
  rows.forEach(row => {
    headers.forEach((header, i) => {
      doc.text(row[header] !== undefined ? String(row[header]) : '', { continued: i < headers.length - 1, width: 120 });
    });
    doc.moveDown();
  });
}

// Download Employee Summary Report (PDF)
app.get('/api/reports/employee-summary', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'firstname lastname email department status role');
    const headers = ['firstname', 'lastname', 'email', 'department', 'status', 'role'];
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_summary.pdf');
    doc.pipe(res);

    // Handle PDFKit errors
    doc.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end('Failed to generate PDF');
      }
    });

    doc.fontSize(16).text('Employee Summary Report', { align: 'center' });
    doc.moveDown();
    const rows = employees.length > 0
      ? employees.map(e => e.toObject())
      : [{ firstname: 'N/A', lastname: 'N/A', email: 'N/A', department: 'N/A', status: 'N/A', role: 'N/A' }];
    addTable(doc, headers, rows);
    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end('Failed to generate employee summary report');
    }
  }
});

// Download Department Analysis Report (PDF)
app.get('/api/reports/department-analysis', async (req, res) => {
  try {
    const departments = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const headers = ['_id', 'count'];
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=department_analysis.pdf');
    doc.pipe(res);

    doc.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end('Failed to generate PDF');
      }
    });

    doc.fontSize(16).text('Department Analysis Report', { align: 'center' });
    doc.moveDown();
    addTable(doc, headers, departments);
    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end('Failed to generate department analysis report');
    }
  }
});

// Download Payroll Report (PDF)
app.get('/api/reports/payroll', async (req, res) => {
  try {
    const employees = await Employee.find({}, 'firstname lastname email department salary');
    const headers = ['firstname', 'lastname', 'email', 'department', 'salary'];
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=payroll_report.pdf');
    doc.pipe(res);

    doc.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end('Failed to generate PDF');
      }
    });

    doc.fontSize(16).text('Payroll Report', { align: 'center' });
    doc.moveDown();
    addTable(doc, headers, employees.map(e => e.toObject()));
    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end('Failed to generate payroll report');
    }
  }
});

// Download Attendance Report (PDF)
app.get('/api/reports/attendance', async (req, res) => {
  try {
    // Get month from query param, default to current month
    let { month } = req.query;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    // month is in format YYYY-MM
    const employees = await Employee.find({}, 'firstname lastname email attendance');
    const rows = [];
    employees.forEach(emp => {
      (emp.attendance || []).forEach(a => {
        // Only include attendance for the selected month
        if (a.date && a.date.startsWith(month)) {
          rows.push({
            firstname: String(emp.firstname || ''),
            lastname: String(emp.lastname || ''),
            email: String(emp.email || ''),
            date: String(a.date || ''),
            status: String(a.status || '')
          });
        }
      });
    });
    // Debug: log how many rows are being added
    console.log(`[Attendance Report] Month: ${month}, Rows: ${rows.length}`);
    const headers = ['firstname', 'lastname', 'email', 'date', 'status'];
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${month}.pdf`);
    doc.pipe(res);

    doc.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end('Failed to generate PDF');
      }
    });

    doc.fontSize(16).text(`Attendance Report (${month})`, { align: 'center' });
    doc.moveDown();
    addTable(
      doc,
      headers,
      rows.length > 0
        ? rows
        : [{
            firstname: 'No data',
            lastname: '-',
            email: '-',
            date: '-',
            status: '-'
          }]
    );
    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end('Failed to generate attendance report');
    }
  }
});

// Download Payslip PDF for an employee for a given month
app.get('/api/employees/:id/payslip', async (req, res) => {
  try {
    const { id } = req.params;
    let { month } = req.query;
    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const emp = await Employee.findById(id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${emp.firstname}_${emp.lastname}_${month}.pdf`);
    doc.pipe(res);

    doc.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end('Failed to generate payslip PDF');
      }
    });

    // Payslip Header
    doc.fontSize(18).text('Payslip', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Month: ${month}`, { align: 'right' });
    doc.moveDown();

    // Employee Details
    doc.fontSize(12).text(`Name: ${emp.firstname} ${emp.lastname}`);
    doc.text(`Email: ${emp.email}`);
    doc.text(`Department: ${emp.department || '-'}`);
    doc.text(`Position: ${emp.position || '-'}`);
    doc.text(`Employee ID: ${emp._id}`);
    doc.moveDown();

    // Salary Details
    doc.fontSize(14).text('Salary Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Base Salary: ₹${(emp.salary || 0).toLocaleString('en-IN')}`);
    // Add more breakdown if needed (e.g., allowances, deductions)
    doc.moveDown();

    // Footer
    doc.text('This is a system generated payslip.', { align: 'center', fontSize: 10 });
    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).end('Failed to generate payslip');
    }
  }
});
// --- End Reports API ---

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
    // Convert to { superadmin: X, admin: Y, employee: Z }
    const result = { superadmin: 0, admin: 0, employee: 0 };
    counts.forEach(item => {
      if (item._id === 'superadmin' || item._id === 'superadmin') result.superadmin = item.count;
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

// Add this endpoint before app.listen
app.get('/api/employees/:id/salary', async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    
    // Get base salary (annual)
    const baseSalary = emp.salary ?? 0;
    
    // Calculate total allowances
    const totalAllowances = emp.allowances 
      ? emp.allowances.reduce((sum, allowance) => sum + (allowance.amount || 0), 0)
      : 0;
    
    // Calculate total deductions
    const totalDeductions = emp.deductions 
      ? emp.deductions.reduce((sum, deduction) => sum + (deduction.amount || 0), 0)
      : 0;
    
    // Calculate gross monthly salary (base + allowances, divided by 12 for monthly)
    const grossMonthlySalary = (baseSalary + totalAllowances) / 12;
    
    // Calculate net monthly salary (gross - deductions)
    const netMonthlySalary = grossMonthlySalary - (totalDeductions / 12);
    
    console.log(`Salary calculation for employee ${emp.employeeId}:`, {
      baseSalary,
      totalAllowances,
      totalDeductions,
      grossMonthlySalary,
      netMonthlySalary
    });
    
    res.json({ 
      salary: baseSalary,
      allowances: emp.allowances || [],
      deductions: emp.deductions || [],
      totalAllowances,
      totalDeductions,
      grossMonthlySalary: Math.round(grossMonthlySalary * 100) / 100, // Round to 2 decimal places
      netMonthlySalary: Math.round(netMonthlySalary * 100) / 100 // Round to 2 decimal places
    });
  } catch (err) {
    console.error('Error fetching salary:', err);
    res.status(500).json({ error: 'Failed to fetch salary' });
  }
});

// --- Schedule Report Endpoint ---
app.post('/api/reports/schedule', async (req, res) => {
  try {
    const { type, date, email } = req.body;
    if (!type || !date || !email) {
      return res.status(400).json({ error: 'Type, date, and email are required.' });
    }
    await ScheduledReport.create({ type, date, email });
    res.json({ message: 'Report scheduled successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule report.' });
  }
});
// --- End Schedule Report Endpoint ---

// --- Automated Scheduled Report Sender ---
const sendScheduledReports = async () => {
  const now = new Date();
  // Find all pending reports scheduled for now or earlier
  const pending = await ScheduledReport.find({ status: 'pending', date: { $lte: now } });
  for (const report of pending) {
    try {
      // Generate report CSV
      let csv, filename;
      if (report.type === 'summary') {
        const employees = await Employee.find({}, 'firstname lastname email department status role');
        const fields = ['firstname', 'lastname', 'email', 'department', 'status', 'role'];
        const parser = new (require('json2csv').Parser)({ fields });
        csv = parser.parse(employees);
        filename = 'employee_summary.csv';
      } else if (report.type === 'analytics') {
        const departments = await Employee.aggregate([
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        const fields = ['_id', 'count'];
        const parser = new (require('json2csv').Parser)({ fields });
        csv = parser.parse(departments);
        filename = 'department_analysis.csv';
      } else if (report.type === 'financial') {
        const employees = await Employee.find({}, 'firstname lastname email department salary');
        const fields = ['firstname', 'lastname', 'email', 'department', 'salary'];
        const parser = new (require('json2csv').Parser)({ fields });
        csv = parser.parse(employees);
        filename = 'payroll_report.csv';
      } else if (report.type === 'attendance') {
        const employees = await Employee.find({}, 'firstname lastname email attendance');
        const rows = [];
        employees.forEach(emp => {
          (emp.attendance || []).forEach(a => {
            rows.push({
              firstname: emp.firstname,
              lastname: emp.lastname,
              email: emp.email,
              date: a.date,
              status: a.status
            });
          });
        });
        const fields = ['firstname', 'lastname', 'email', 'date', 'status'];
        const parser = new (require('json2csv').Parser)({ fields });
        csv = parser.parse(rows);
        filename = 'attendance_report.csv';
      } else {
        throw new Error('Unknown report type');
      }
      // Send email
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.REPORT_EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.REPORT_EMAIL_PASS || 'your-app-password'
        }
      });
      await transporter.sendMail({
        from: process.env.REPORT_EMAIL_USER || 'your-email@gmail.com',
        to: report.email,
        subject: 'Your Scheduled Report',
        text: 'Please find your scheduled report attached.',
        attachments: [{ filename, content: csv }]
      });
      report.status = 'sent';
      await report.save();
    } catch (err) {
      report.status = 'failed';
      await report.save();
    }
  }
};
// Run every 1 minute
cron.schedule('* * * * *', sendScheduledReports);
// --- End Automated Scheduled Report Sender ---

// --- Holiday Schema and Endpoints ---
const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  createdBy: String,
});
const Holiday = mongoose.model('Holiday', holidaySchema);

// Add a holiday (admin only)
app.post('/api/holidays', async (req, res) => {
  try {
    const { name, date, createdBy } = req.body;
    if (!name || !date) return res.status(400).json({ error: 'Name and date are required' });
    const holiday = new Holiday({ name, date, createdBy });
    await holiday.save();
    res.json({ success: true, holiday });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all holidays
app.get('/api/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ holidays });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- End Holiday Schema and Endpoints ---
// --- Settings Model for Payroll Standards ---
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});
const Settings = mongoose.model('Settings', settingsSchema);

// --- Apply Payroll Standards to All Employees ---
app.post('/api/payroll/apply-standards-to-all', async (req, res) => {
  try {
    // Fetch standards from settings
    const settings = await Settings.findOne({ key: 'payroll_standards' });
    if (!settings) return res.status(404).json({ error: 'Payroll standards not found' });
    const { allowances, deductions } = settings.value || {};
    // Update all employees
    await Employee.updateMany({}, {
      $set: {
        allowances: allowances || [],
        deductions: deductions || []
      }
    });
    res.json({ success: true, message: 'Standards applied to all employees.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply standards', details: error.message });
  }
});

// --- Create Initial Payroll Standards (one-time endpoint) ---
app.post('/api/payroll/create-initial-standards', async (req, res) => {
  try {
    const exists = await Settings.findOne({ key: 'payroll_standards' });
    if (exists) return res.status(400).json({ error: 'payroll_standards already exists' });
    const { allowances, deductions } = req.body || {};
    const doc = new Settings({
      key: 'payroll_standards',
      value: {
        allowances: Array.isArray(allowances) ? allowances : [
          { name: 'HRA', amount: 5000 },
          { name: 'Transport', amount: 2000 }
        ],
        deductions: Array.isArray(deductions) ? deductions : [
          { name: 'PF', amount: 1800 },
          { name: 'Professional Tax', amount: 200 }
        ]
      }
    });
    await doc.save();
    res.json({ success: true, message: 'Initial payroll standards created.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

global._io = io; // Make io accessible globally if needed
// --- END SOCKET.IO SETUP ---

// --- Document (Company Policy) Model ---
const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String }, // Add description field
  filePath: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  uploadedAt: { type: Date, default: Date.now }
});
const Document = mongoose.model('Document', documentSchema);

// Policy model (alias for Document to match frontend expectations)
const PolicyDoc = Document;
// --- End Document Model ---

// --- Policy Endpoints (Compatible with frontend) ---
// Get all policies
app.get('/api/policies', async (req, res) => {
  try {
    const policies = await PolicyDoc.find({}).populate('uploadedBy', 'firstname lastname email').sort({ uploadedAt: -1 });
    // Transform to match frontend expectations
    const transformedPolicies = policies.map(policy => ({
      _id: policy._id,
      title: policy.title,
      description: policy.description,
      fileUrl: `http://localhost:5050${policy.filePath}`, // Full URL for file access
      uploadedBy: policy.uploadedBy,
      uploadedAt: policy.uploadedAt
    }));
    res.json(transformedPolicies);
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ error: 'Failed to fetch policies', details: err.message });
  }
});

// Upload a new policy document
app.post('/api/policies', upload.single('file'), async (req, res) => {
  try {
    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Only allow PDF files
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Create new policy document
    const policy = new PolicyDoc({
      title,
      description: description || '',
      filePath: `/uploads/${req.file.filename}`,
      uploadedBy: new mongoose.Types.ObjectId() // You might want to get this from auth middleware
    });
    
    await policy.save();
    
    // Return the created policy with populated data
    const populatedPolicy = await PolicyDoc.findById(policy._id).populate('uploadedBy', 'firstname lastname email');
    
    res.status(201).json({
      message: 'Policy document uploaded successfully',
      policy: {
        _id: populatedPolicy._id,
        title: populatedPolicy.title,
        description: populatedPolicy.description,
        fileUrl: `http://localhost:5050${populatedPolicy.filePath}`,
        uploadedBy: populatedPolicy.uploadedBy,
        uploadedAt: populatedPolicy.uploadedAt
      }
    });
  } catch (err) {
    console.error('Error uploading policy:', err);
    res.status(500).json({ error: 'Failed to upload policy document', details: err.message });
  }
});

// Delete a policy document
app.delete('/api/policies/:id', async (req, res) => {
  try {
    const policy = await PolicyDoc.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy document not found' });
    }
    
    // Delete the file from filesystem
    const filePath = path.join(__dirname, policy.filePath.replace('/uploads', 'uploads'));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await PolicyDoc.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Policy document deleted successfully' });
  } catch (err) {
    console.error('Error deleting policy:', err);
    res.status(500).json({ error: 'Failed to delete policy document', details: err.message });
  }
});
// --- End Policy Endpoints ---

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// GET endpoint to fetch all sessions for an employee
app.get('/api/sessions', async (req, res) => {
  try {
    const { employeeId } = req.query;
    console.log('Fetching sessions for employeeId:', employeeId);
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    const sessions = await Session.find({ employeeId }).sort({ startTime: -1 });
    console.log('Sessions found:', sessions);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/sessions', async (req, res) => {
  try {
    const { employeeId } = req.query;
    console.log('Fetching sessions for employeeId:', employeeId);
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    const sessions = await Session.find({ employeeId }).sort({ startTime: -1 });
    console.log('Sessions found:', sessions);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-delete holidays whose date has passed (runs every day at 1:00 AM)
cron.schedule('0 1 * * *', async () => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    const result = await Holiday.deleteMany({ date: { $lt: todayStr } });
    if (result.deletedCount > 0) {
      console.log(`Auto-deleted ${result.deletedCount} past holidays.`);
    }
  } catch (err) {
    console.error('Error auto-deleting past holidays:', err);
  }
});

// Log all incoming requests and their bodies, except for /socket.io
app.use((req, res, next) => {
  if (!req.url.startsWith('/socket.io')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Request body:', req.body);
    }
  }
  next();
});

// Assign or change team lead (admin/HR only)
app.put('/api/teams/:teamId/team-lead', authorizeRoles(['admin', 'hr', 'superadmin']), async (req, res) => {
  try {
    const { teamLeadId } = req.body;
    if (!teamLeadId) return res.status(400).json({ error: 'teamLeadId is required' });
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    team.teamLead = teamLeadId;
    await team.save();
    res.json({ message: 'Team lead assigned', team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Role Management Endpoints ---
// Create a new role
app.post('/api/roles', async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name || !Array.isArray(permissions)) return res.status(400).json({ error: 'Name and permissions required' });
    const role = new Role({ name, permissions });
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// List all roles
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Update a role
app.put('/api/roles/:id', async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = await Role.findByIdAndUpdate(req.params.id, { name, permissions }, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Delete a role
app.delete('/api/roles/:id', async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --- End Role Management Endpoints ---

// Assign a custom role to an employee
app.put('/api/employees/:id/role', authorizePermission('assign_roles'), async (req, res) => {
  try {
    let { roleId } = req.body;
    // Allow demotion: if roleId is null, undefined, or empty string, clear roleRef
    if (roleId === null || roleId === undefined || roleId === '') {
      roleId = null;
    }
    const emp = await Employee.findByIdAndUpdate(
      req.params.id,
      { roleRef: roleId },
      { new: true }
    );
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(emp);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Manager API Endpoints ---
// Get team members for a manager
app.get('/api/manager/team', async (req, res) => {
  try {
    const { managerId } = req.query;
    if (!managerId) return res.status(400).json({ error: 'managerId is required' });
    // Find teams where this manager is the teamLead
    const teams = await Team.find({ teamLead: managerId }).populate({ path: 'members', select: 'firstname lastname email department position role' });
    // Flatten all members (if manager leads multiple teams)
    let members = [];
    teams.forEach(team => {
      if (Array.isArray(team.members)) {
        members = members.concat(team.members);
      }
    });
    // Remove duplicates by _id
    const uniqueMembers = Array.from(new Map(members.map(m => [m._id.toString(), m])).values());
    res.json({ teamMembers: uniqueMembers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team members', details: err.message });
  }
});

// Get leave requests for a manager's team
app.get('/api/manager/leaves', async (req, res) => {
  try {
    const { managerId } = req.query;
    if (!managerId) return res.status(400).json({ error: 'managerId is required' });
    // Find teams managed by this manager
    const teams = await Team.find({ teamLead: managerId });
    const memberIds = teams.flatMap(team => team.members.map(m => m.toString()));
    // Find leaves for these members
    const leaves = await Leave.find({ employee: { $in: memberIds } })
      .populate({ path: 'employee', select: 'firstname lastname email department' })
      .sort({ createdAt: -1 });
    res.json({ leaves });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team leaves', details: err.message });
  }
});

// Approve/reject leave (manager action)
app.post('/api/manager/leaves/:leaveId/:action', async (req, res) => {
  try {
    const { leaveId, action } = req.params;
    const { managerId } = req.body;
    if (!managerId) return res.status(400).json({ error: 'managerId is required' });
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    // Find the leave
    const leave = await Leave.findById(leaveId);
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    // Check if the employee is in a team managed by this manager
    const teams = await Team.find({ teamLead: managerId });
    const memberIds = teams.flatMap(team => team.members.map(m => m.toString()));
    if (!memberIds.includes(leave.employee.toString())) {
      return res.status(403).json({ error: 'Not authorized to approve/reject this leave' });
    }
    if (leave.status !== 'Pending') {
      return res.status(400).json({ error: 'Leave already processed' });
    }
    leave.status = action === 'approve' ? 'Approved' : 'Rejected';
    await leave.save();
    // If approved, mark attendance as present for each date in the leave range
    if (leave.status === 'Approved') {
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
    res.json({ message: `Leave ${leave.status.toLowerCase()}`, leave });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process leave', details: err.message });
  }
});

// Team attendance summary for a manager
app.get('/api/manager/attendance', async (req, res) => {
  try {
    const { managerId, month } = req.query;
    if (!managerId) return res.status(400).json({ error: 'managerId is required' });
    // Find teams managed by this manager
    const teams = await Team.find({ teamLead: managerId });
    const memberIds = teams.flatMap(team => team.members.map(m => m.toString()));
    // Get attendance for each member for the given month
    const employees = await Employee.find({ _id: { $in: memberIds } }, 'firstname lastname email attendance');
    const summary = employees.map(emp => {
      const attendance = (emp.attendance || []).filter(a => {
        if (!a.date) return false;
        if (!month) return true;
        return a.date.startsWith(month); // month = 'YYYY-MM'
      });
      return {
        _id: emp._id,
        firstname: emp.firstname,
        lastname: emp.lastname,
        email: emp.email,
        attendance
      };
    });
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance summary', details: err.message });
  }
});
// --- End Manager API Endpoints ---

// --- Standard Payroll Configuration Model ---
const standardPayrollSchema = new mongoose.Schema({
  type: { type: String, enum: ['allowance', 'deduction'], required: true },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
const StandardPayroll = mongoose.model('StandardPayroll', standardPayrollSchema);

// Function to get current standard allowances and deductions
async function getStandardPayrollItems() {
  try {
    const allowances = await StandardPayroll.find({ type: 'allowance', isActive: true });
    const deductions = await StandardPayroll.find({ type: 'deduction', isActive: true });
    return {
      allowances: allowances.map(a => ({ name: a.name, amount: a.amount })),
      deductions: deductions.map(d => ({ name: d.name, amount: d.amount }))
    };
  } catch (error) {
    console.error('Error fetching standard payroll items:', error);
    return { allowances: [], deductions: [] };
  }
}

// Function to initialize default standard payroll items
async function initializeStandardPayroll() {
  try {
    const existingCount = await StandardPayroll.countDocuments();
    if (existingCount === 0) {
      console.log('Initializing default standard payroll items...');
      
      // Default allowances
      const defaultAllowances = [
        { type: 'allowance', name: 'HRA', amount: 5000, description: 'House Rent Allowance' },
        { type: 'allowance', name: 'Transport', amount: 2000, description: 'Transportation Allowance' },
        { type: 'allowance', name: 'Medical', amount: 1500, description: 'Medical Allowance' }
      ];
      
      // Default deductions
      const defaultDeductions = [
        { type: 'deduction', name: 'PF', amount: 1800, description: 'Provident Fund' },
        { type: 'deduction', name: 'Professional Tax', amount: 200, description: 'Professional Tax' },
        { type: 'deduction', name: 'Insurance', amount: 500, description: 'Employee Insurance' }
      ];
      
      await StandardPayroll.insertMany([...defaultAllowances, ...defaultDeductions]);
      console.log('Default standard payroll items initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing standard payroll:', error);
  }
}
// --- End Standard Payroll Configuration Model ---

// --- Standard Payroll API Endpoints ---

// Get standard allowances and deductions
app.get('/api/payroll/standards', async (req, res) => {
  try {
    const standards = await getStandardPayrollItems();
    res.json(standards);
  } catch (error) {
    console.error('Error fetching standard payroll:', error);
    res.status(500).json({ error: 'Failed to fetch standard payroll items' });
  }
});

// Get all standard payroll items (for admin management)
app.get('/api/payroll/standards/all', async (req, res) => {
  try {
    const items = await StandardPayroll.find().sort({ type: 1, name: 1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching all standard payroll items:', error);
    res.status(500).json({ error: 'Failed to fetch standard payroll items' });
  }
});

// Add new standard allowance or deduction
app.post('/api/payroll/standards', async (req, res) => {
  try {
    const { type, name, amount, description } = req.body;
    
    if (!type || !name || amount === undefined) {
      return res.status(400).json({ error: 'Type, name, and amount are required' });
    }
    
    if (!['allowance', 'deduction'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "allowance" or "deduction"' });
    }
    
    // Check if already exists
    const existing = await StandardPayroll.findOne({ type, name, isActive: true });
    if (existing) {
      return res.status(400).json({ error: `${type} with name "${name}" already exists` });
    }
    
    const newItem = new StandardPayroll({
      type,
      name,
      amount: Number(amount),
      description: description || '',
      isActive: true
    });
    
    await newItem.save();
    console.log(`New standard ${type} added: ${name} - ₹${amount}`);
    
    res.json({ message: `Standard ${type} added successfully`, item: newItem });
  } catch (error) {
    console.error('Error adding standard payroll item:', error);
    res.status(500).json({ error: 'Failed to add standard payroll item' });
  }
});

// Update standard allowance or deduction
app.put('/api/payroll/standards/:id', async (req, res) => {
  try {
    const { name, amount, description, isActive } = req.body;
    
    const item = await StandardPayroll.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Standard payroll item not found' });
    }
    
    if (name !== undefined) item.name = name;
    if (amount !== undefined) item.amount = Number(amount);
    if (description !== undefined) item.description = description;
    if (isActive !== undefined) item.isActive = Boolean(isActive);
    
    await item.save();
    console.log(`Standard ${item.type} updated: ${item.name} - ₹${item.amount}`);
    
    res.json({ message: `Standard ${item.type} updated successfully`, item });
  } catch (error) {
    console.error('Error updating standard payroll item:', error);
    res.status(500).json({ error: 'Failed to update standard payroll item' });
  }
});

// Delete standard allowance or deduction
app.delete('/api/payroll/standards/:id', async (req, res) => {
  try {
    const item = await StandardPayroll.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Standard payroll item not found' });
    }
    
    await StandardPayroll.findByIdAndDelete(req.params.id);
    console.log(`Standard ${item.type} deleted: ${item.name}`);
    
    res.json({ message: `Standard ${item.type} deleted successfully` });
  } catch (error) {
    console.error('Error deleting standard payroll item:', error);
    res.status(500).json({ error: 'Failed to delete standard payroll item' });
  }
});
// --- End Standard Payroll API Endpoints ---

// Apply standard allowances and deductions to all employees who don't have them
app.post('/api/payroll/apply-standards', async (req, res) => {
  try {
    const standardPayroll = await getStandardPayrollItems();
    const { force = false } = req.body; // Force update even if employee already has allowances/deductions
    
    // Find employees who need standard payroll items
    let query = {};
    if (!force) {
      query = {
        $or: [
          { allowances: { $exists: false } },
          { allowances: { $size: 0 } },
          { deductions: { $exists: false } },
          { deductions: { $size: 0 } }
        ]
      };
    }
    
    const employees = await Employee.find(query);
    let updatedCount = 0;
    
    for (const employee of employees) {
      let shouldUpdate = false;
      
      if (force || !employee.allowances || employee.allowances.length === 0) {
        employee.allowances = standardPayroll.allowances;
        shouldUpdate = true;
      }
      
      if (force || !employee.deductions || employee.deductions.length === 0) {
        employee.deductions = standardPayroll.deductions;
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        await employee.save();
        updatedCount++;
        console.log(`Applied standard payroll to employee: ${employee.firstname} ${employee.lastname} (${employee.employeeId})`);
      }
    }
    
    res.json({
      message: `Standard payroll applied to ${updatedCount} employee(s)`,
      updated: updatedCount,
      standardPayroll
    });
    
  } catch (error) {
    console.error('Error applying standard payroll:', error);
    res.status(500).json({ error: 'Failed to apply standard payroll to employees' });
  }
});

