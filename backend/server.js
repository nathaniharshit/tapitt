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
  const { employeeName, employeeId } = req.body || {};

  try {
    // Save session to database
    const session = new Session({
      employeeId: employeeId,
      employeeName: employeeName,
      startTime: new Date(),
    });
    await session.save();
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
    // Initialize default payroll standards in Settings if not exists
    await initializePayrollStandards();
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
  type: { type: String, enum: ['Sick', 'Casual', 'Paid'], required: true },
  from: { type: String, required: true }, // YYYY-MM-DD
  to: { type: String, required: true },   // YYYY-MM-DD
  reason: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  quarter: { type: String, required: true }, // Q1, Q2, Q3, Q4
  year: { type: Number, required: true }, // Financial year
  days: { type: Number, required: true }, // Number of days
  createdAt: { type: Date, default: Date.now }
});
const Leave = mongoose.model('Leave', leaveSchema);
// --- End Leave Model ---

// --- Quarterly Leave Model ---
const quarterlyLeaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true }, // Financial year
  quarter: { type: String, required: true }, // Q1, Q2, Q3, Q4
  allocated: {
    sick: { type: Number, default: 2 },
    casual: { type: Number, default: 2 },
    paid: { type: Number, default: 2 }
  },
  used: {
    sick: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    paid: { type: Number, default: 0 }
  },
  carriedForward: {
    sick: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    paid: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Compound index for efficient queries
quarterlyLeaveSchema.index({ employee: 1, year: 1, quarter: 1 }, { unique: true });

const QuarterlyLeave = mongoose.model('QuarterlyLeave', quarterlyLeaveSchema);
// --- End Quarterly Leave Model ---

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
    
    // Calculate payroll amounts based on employee's salary (create temporary employee object for calculation)
    const tempEmployee = { salary: employeeData.salary || 0 };
    const payrollData = calculateEmployeePayroll(tempEmployee, standardPayroll);
    
    employeeData.allowances = payrollData.allowances;
    employeeData.deductions = payrollData.deductions;
    
    const employee = new Employee(employeeData);
    await employee.save();
    
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

// --- Quarterly Leave Utility Functions ---

// Get current financial quarter (April-based year)
function getCurrentFinancialQuarter(date = new Date()) {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  let quarter, financialYear;
  if (month >= 4 && month <= 6) {
    quarter = 'Q1'; financialYear = year;
  } else if (month >= 7 && month <= 9) {
    quarter = 'Q2'; financialYear = year;
  } else if (month >= 10 && month <= 12) {
    quarter = 'Q3'; financialYear = year;
  } else {
    quarter = 'Q4'; financialYear = year - 1;
  }
  
  return { quarter, year: financialYear };
}

// Calculate number of days between two dates
function calculateLeaveDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  return diffDays;
}

// Get or create quarterly leave record
async function getOrCreateQuarterlyLeave(employeeId, year, quarter) {
  let quarterlyLeave = await QuarterlyLeave.findOne({ employee: employeeId, year, quarter });
  
  if (!quarterlyLeave) {
    // Create new quarterly leave record with default allocations
    quarterlyLeave = new QuarterlyLeave({
      employee: employeeId,
      year,
      quarter,
      allocated: { sick: 2, casual: 2, paid: 2 },
      used: { sick: 0, casual: 0, paid: 0 },
      carriedForward: { sick: 0, casual: 0, paid: 0 }
    });
    await quarterlyLeave.save();
  }
  
  return quarterlyLeave;
}

// Calculate available leave balance for each type
function calculateAvailableLeaves(quarterlyLeave) {
  const available = {};
  ['sick', 'casual', 'paid'].forEach(type => {
    const allocated = quarterlyLeave.allocated[type] || 0;
    const carriedForward = quarterlyLeave.carriedForward[type] || 0;
    const used = quarterlyLeave.used[type] || 0;
    available[type] = allocated + carriedForward - used;
  });
  return available;
}

// Carry forward unused leaves to next quarter
async function carryForwardLeaves(employeeId, fromYear, fromQuarter) {
  const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentIndex = quarterOrder.indexOf(fromQuarter);
  
  let toYear = fromYear;
  let toQuarter;
  
  if (currentIndex === 3) { // Q4 -> Q1 of next year
    toYear = fromYear + 1;
    toQuarter = 'Q1';
  } else {
    toQuarter = quarterOrder[currentIndex + 1];
  }
  
  const fromQuarterlyLeave = await QuarterlyLeave.findOne({ 
    employee: employeeId, 
    year: fromYear, 
    quarter: fromQuarter 
  });
  
  if (!fromQuarterlyLeave) return;
  
  const available = calculateAvailableLeaves(fromQuarterlyLeave);
  const toQuarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, toYear, toQuarter);
  
  // Carry forward ALL unused leaves to next quarter
  ['sick', 'casual', 'paid'].forEach(type => {
    const carryForward = available[type]; // Carry forward all available leaves
    toQuarterlyLeave.carriedForward[type] = carryForward;
  });
  
  await toQuarterlyLeave.save();
}

// --- End Quarterly Leave Utility Functions ---

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
    
    // Calculate leave days and quarter
    const days = calculateLeaveDays(from, to);
    const { quarter, year } = getCurrentFinancialQuarter(new Date(from));
    
    // Get or create quarterly leave record
    const quarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
    
    // Check if employee has enough leave balance
    const available = calculateAvailableLeaves(quarterlyLeave);
    const leaveType = type.toLowerCase();
    
    if (available[leaveType] < days) {
      return res.status(400).json({ 
        error: `Insufficient ${type} leave balance. Available: ${available[leaveType]}, Requested: ${days}` 
      });
    }
    
    // Create leave request
    const leave = new Leave({ 
      employee: employeeId, 
      type, 
      from, 
      to, 
      reason, 
      quarter, 
      year, 
      days 
    });
    await leave.save();
    
    // Return leave with employeeId for frontend
    res.status(201).json({
      ...leave.toObject(),
      employeeId: leave.employee.toString()
    });
  } catch (err) {
    console.error('Leave creation error:', err);
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
      
      // Calculate new leave days and quarter
      const newDays = calculateLeaveDays(from, to);
      const { quarter, year } = getCurrentFinancialQuarter(new Date(from));
      
      // Get quarterly leave record
      const quarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
      
      // Check if employee has enough leave balance (considering the current leave being edited)
      const available = calculateAvailableLeaves(quarterlyLeave);
      const leaveType = type.toLowerCase();
      const currentLeaveType = leave.type.toLowerCase();
      
      // Add back the current leave days to available balance if same type
      let adjustedAvailable = available[leaveType];
      if (currentLeaveType === leaveType) {
        adjustedAvailable += leave.days;
      }
      
      if (adjustedAvailable < newDays) {
        return res.status(400).json({ 
          error: `Insufficient ${type} leave balance. Available: ${adjustedAvailable}, Requested: ${newDays}` 
        });
      }
      
      leave.type = type;
      leave.from = from;
      leave.to = to;
      leave.reason = reason;
      leave.quarter = quarter;
      leave.year = year;
      leave.days = newDays;
      await leave.save();
      return res.json(leave);
    }

    // Admin/superadmin updating status
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      const oldStatus = leave.status;
      leave.status = status;
      await leave.save();

      // Update quarterly leave balance based on status change
      const quarterlyLeave = await getOrCreateQuarterlyLeave(leave.employee, leave.year, leave.quarter);
      const leaveType = leave.type.toLowerCase();
      
      if (status === 'Approved' && oldStatus !== 'Approved') {
        // Deduct from available balance
        quarterlyLeave.used[leaveType] = (quarterlyLeave.used[leaveType] || 0) + leave.days;
        await quarterlyLeave.save();
        
        // Mark attendance as present for each date in the leave range
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
      } else if (status === 'Rejected' && oldStatus === 'Approved') {
        // Add back to available balance
        quarterlyLeave.used[leaveType] = Math.max(0, (quarterlyLeave.used[leaveType] || 0) - leave.days);
        await quarterlyLeave.save();
      }
      
      return res.json(leave);
    }

    return res.status(400).json({ error: 'Invalid request.' });
  } catch (err) {
    console.error('Leave update error:', err);
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

// Get quarterly leave balance for an employee
app.get('/api/leaves/:employeeId/quarterly-balance', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { quarter, year } = getCurrentFinancialQuarter();
    
    // Get or create quarterly leave record for current quarter
    const quarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
    
    // Calculate available leaves
    const available = calculateAvailableLeaves(quarterlyLeave);
    
    // Calculate total for each type (allocated + carried forward)
    const breakdown = {};
    ['sick', 'casual', 'paid'].forEach(type => {
      const allocated = quarterlyLeave.allocated[type] || 0;
      const carriedForward = quarterlyLeave.carriedForward[type] || 0;
      const used = quarterlyLeave.used[type] || 0;
      const total = allocated + carriedForward;
      
      breakdown[type] = {
        allocated,
        carriedForward,
        used,
        total,
        available: available[type]
      };
    });
    
    res.json({
      currentQuarter: `${year}-${quarter}`,
      available,
      breakdown,
      quarterlyLeave: {
        year,
        quarter,
        allocated: quarterlyLeave.allocated,
        used: quarterlyLeave.used,
        carriedForward: quarterlyLeave.carriedForward
      }
    });
  } catch (err) {
    console.error('Quarterly balance error:', err);
    res.status(500).json({ error: 'Failed to fetch quarterly balance' });
  }
});

// Test endpoint to manually trigger carry-forward (for testing purposes)
app.post('/api/leaves/test-carry-forward', async (req, res) => {
  try {
    const { employeeId, fromYear, fromQuarter } = req.body;
    
    if (!employeeId || !fromYear || !fromQuarter) {
      return res.status(400).json({ error: 'employeeId, fromYear, and fromQuarter are required' });
    }
    
    // Execute carry-forward
    await carryForwardLeaves(employeeId, fromYear, fromQuarter);
    
    // Get the next quarter details
    const quarterOrder = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentIndex = quarterOrder.indexOf(fromQuarter);
    
    let toYear = fromYear;
    let toQuarter;
    
    if (currentIndex === 3) { // Q4 -> Q1 of next year
      toYear = fromYear + 1;
      toQuarter = 'Q1';
    } else {
      toQuarter = quarterOrder[currentIndex + 1];
    }
    
    // Get the updated quarterly leave for next quarter
    const nextQuarterLeave = await QuarterlyLeave.findOne({ 
      employee: employeeId, 
      year: toYear, 
      quarter: toQuarter 
    });
    
    res.json({
      message: 'Carry-forward completed',
      fromQuarter: `${fromYear}-${fromQuarter}`,
      toQuarter: `${toYear}-${toQuarter}`,
      carriedForward: nextQuarterLeave?.carriedForward || {},
      nextQuarterRecord: nextQuarterLeave
    });
  } catch (err) {
    console.error('Carry-forward test error:', err);
    res.status(500).json({ error: 'Failed to test carry-forward' });
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
    
    if (!employee) {
      return res.status(401).json({ error: 'Invalid employee ID or password' });
    }
    if (!employee.password) {
      return res.status(403).json({ error: 'Password not set', employeeId: employee._id });
    }
    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
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
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (!Array.isArray(emp.remoteWork)) emp.remoteWork = [];
    if (emp.remoteWork.includes(date)) {
      return res.status(400).json({ error: 'Already marked as remote for this date.' });
    }
    emp.remoteWork.push(date);
    await emp.save();
    res.json({ message: 'Marked as remote', remoteWork: emp.remoteWork });
  } catch (err) {
    console.error('Failed to mark remote:', err);
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

    // Get payroll details
    const standards = await getStandardPayrollItems();
    const payrollDetails = calculateEmployeePayroll(emp, standards);

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
    doc.text(`Employee ID: ${emp.employeeId || emp._id}`);
    doc.moveDown();

    // Salary Details
    doc.fontSize(14).text('Salary Details', { underline: true });
    doc.moveDown(0.5);
    
    // Basic Salary
    doc.fontSize(12).text(`Basic Salary: ₹${payrollDetails.basicSalary.toLocaleString('en-IN')}`);
    doc.moveDown(0.5);
    
    // Allowances
    if (payrollDetails.allowances && payrollDetails.allowances.length > 0) {
      doc.fontSize(13).text('Allowances:', { underline: true });
      doc.moveDown(0.3);
      payrollDetails.allowances.forEach(allowance => {
        doc.fontSize(11).text(`  ${allowance.name} (${allowance.percentage}%): ₹${allowance.amount.toLocaleString('en-IN')}`);
      });
      doc.fontSize(12).text(`Total Allowances: ₹${payrollDetails.totalAllowances.toLocaleString('en-IN')}`, { indent: 20 });
      doc.moveDown(0.5);
    }
    
    // Gross Salary
    doc.fontSize(12).text(`Gross Salary: ₹${payrollDetails.grossSalary.toLocaleString('en-IN')}`, { underline: true });
    doc.moveDown(0.5);
    
    // Deductions
    if (payrollDetails.deductions && payrollDetails.deductions.length > 0) {
      doc.fontSize(13).text('Deductions:', { underline: true });
      doc.moveDown(0.3);
      payrollDetails.deductions.forEach(deduction => {
        doc.fontSize(11).text(`  ${deduction.name} (${deduction.percentage}%): ₹${deduction.amount.toLocaleString('en-IN')}`);
      });
      doc.fontSize(12).text(`Total Deductions: ₹${payrollDetails.totalDeductions.toLocaleString('en-IN')}`, { indent: 20 });
      doc.moveDown(0.5);
    }
    
    // Net Salary
    doc.fontSize(14).text(`Net Salary: ₹${payrollDetails.netSalary.toLocaleString('en-IN')}`, { underline: true });
    doc.moveDown();
    
    // Annual CTC
    doc.fontSize(12).text(`Annual CTC: ₹${(payrollDetails.grossSalary * 12).toLocaleString('en-IN')}`);
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

// --- Payroll Calculation Functions (Percentage-based Only) ---
async function getStandardPayrollItems() {
  try {
    const settings = await Settings.findOne({ key: 'payroll_standards' });
    if (!settings) return { allowances: [], deductions: [] };
    return settings.value || { allowances: [], deductions: [] };
  } catch (error) {
    console.error('Error fetching standard payroll items:', error);
    return { allowances: [], deductions: [] };
  }
}

function calculateEmployeePayroll(employee, standards) {
  const annualSalary = employee?.salary || 0;
  const basicSalary = annualSalary / 12; // Monthly basic
  
  if (!standards || !standards.allowances || !standards.deductions) {
    return {
      basicSalary: Math.round(basicSalary * 100) / 100,
      grossSalary: Math.round(basicSalary * 100) / 100,
      netSalary: Math.round(basicSalary * 100) / 100,
      allowances: [],
      deductions: [],
      totalAllowances: 0,
      totalDeductions: 0
    };
  }

  const calculatedAllowances = (standards.allowances || []).map(allowance => {
    const amount = basicSalary * (allowance.percentage / 100);
    return {
      name: allowance.name,
      amount: Math.round(amount * 100) / 100, // round to 2 decimal places
      percentage: allowance.percentage,
      calculationType: 'percentage' // Explicitly set for frontend
    };
  });

  const totalAllowances = calculatedAllowances.reduce((sum, item) => sum + item.amount, 0);
  const grossSalary = basicSalary + totalAllowances;

  const calculatedDeductions = (standards.deductions || []).map(deduction => {
    // Deductions are calculated on the gross salary
    const amount = grossSalary * (deduction.percentage / 100);
    return {
      name: deduction.name,
      amount: Math.round(amount * 100) / 100, // round to 2 decimal places
      percentage: deduction.percentage,
      calculationType: 'percentage' // Explicitly set for frontend
    };
  });

  const totalDeductions = calculatedDeductions.reduce((sum, item) => sum + item.amount, 0);
  const netSalary = grossSalary - totalDeductions;

  const result = {
    basicSalary: Math.round(basicSalary * 100) / 100,
    grossSalary: Math.round(grossSalary * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    allowances: calculatedAllowances,
    deductions: calculatedDeductions,
    totalAllowances: Math.round(totalAllowances * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100
  };
  
  return result;
}

async function initializePayrollStandards() {
  try {
    const exists = await Settings.findOne({ key: 'payroll_standards' });
    if (!exists) {
      await Settings.create({
        key: 'payroll_standards',
        value: {
          allowances: [
            { name: 'HRA', percentage: 30 },
            { name: 'Transport', percentage: 10 }
          ],
          deductions: [
            { name: 'PF', percentage: 5 },
            { name: 'Professional Tax', percentage: 2 }
          ]
        }
      });
      console.log('Initialized default percentage-based payroll standards in Settings.');
    }
  } catch (error) {
    console.error('Error initializing payroll standards:', error);
  }
}
// --- End Payroll Calculation Functions ---

// --- Settings Model for Payroll Standards ---
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: {
    allowances: [{
      name: { type: String, required: true },
      percentage: { type: Number, required: true } // Enforce percentage only
    }],
    deductions: [{
      name: { type: String, required: true },
      percentage: { type: Number, required: true } // Enforce percentage only
    }]
  }
});
const Settings = mongoose.model('Settings', settingsSchema);

// --- Payroll Management Endpoints (Settings-based) ---
app.get('/api/payroll/standards', async (req, res) => {
  try {
    const settings = await Settings.findOne({ key: 'payroll_standards' });
    res.json(settings ? settings.value : { allowances: [], deductions: [] });
  } catch (error) {
    console.error('Error fetching payroll standards:', error);
    res.status(500).json({ error: 'Failed to fetch payroll standards' });
  }
});

app.post('/api/payroll/standards', async (req, res) => {
  try {
    const { allowances, deductions } = req.body;

    // Validate that all incoming items are percentage-based
    const validateItems = (items) => {
      if (!Array.isArray(items)) return false;
      return items.every(item => 
        item &&
        typeof item.name === 'string' &&
        typeof item.percentage === 'number' &&
        Object.keys(item).length === 2 // Ensures no extra properties like 'amount'
      );
    };

    if (!validateItems(allowances) || !validateItems(deductions)) {
      return res.status(400).json({ error: 'Invalid data format. All items must have only a name and a percentage.' });
    }

    let settings = await Settings.findOneAndUpdate(
      { key: 'payroll_standards' },
      { value: { allowances, deductions } },
      { new: true, upsert: true }
    );
    
    res.json(settings.value);
  } catch (error) {
    console.error('Error updating payroll standards:', error);
    res.status(500).json({ error: 'Failed to update payroll standards' });
  }
});

app.post('/api/payroll/apply-standards-to-all', async (req, res) => {
  try {
    const standardPayroll = await getStandardPayrollItems();
    
    const employees = await Employee.find({});
    let updated = 0;
    
    for (const employee of employees) {
      // Calculate fresh payroll amounts based on employee's salary
      const payrollData = calculateEmployeePayroll(employee, standardPayroll);
      
      // Clear existing payroll items and set new calculated ones
      employee.allowances = payrollData.allowances;
      employee.deductions = payrollData.deductions;
      
      await employee.save();
      updated++;
      
      console.log('Applied percentage-based payroll for: ' + employee.firstname + ' ' + employee.lastname + ' (Salary: Rs.' + employee.salary + ')');
    }
    
    res.json({
      message: 'Applied percentage-based payroll for ' + updated + ' employee(s)',
      updated,
      standardPayroll
    });
    
  } catch (error) {
    console.error('Error applying standards:', error);
    res.status(500).json({ error: 'Failed to apply standards to all employees' });
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
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
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
    const policies = await PolicyDoc.find({})
      .populate({ path: 'uploadedBy', select: 'firstname lastname' })
      .sort({ uploadedAt: -1 });
    
    res.json(policies.map(policy => ({
      _id: policy._id,
      title: policy.title,
      description: policy.description,
      uploadedBy: policy.uploadedBy ? (policy.uploadedBy.firstname + ' ' + policy.uploadedBy.lastname) : 'Admin',
      uploadedAt: policy.uploadedAt,
      fileUrl: 'http://localhost:5050' + policy.filePath, // Full URL for file access
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

app.post('/api/policies', upload.single('file'), async (req, res) => {
  try {
    const { title, description, uploadedBy } = req.body;
    
    console.log('Policy upload request:', { title, description, uploadedBy, hasFile: !!req.file });
    
    if (!title || !req.file) {
      console.log('Missing title or file:', { title: !!title, file: !!req.file });
      return res.status(400).json({ error: 'Title and file are required' });
    }
    
    const policy = new PolicyDoc({
      title,
      description: description || '',
      filePath: '/uploads/' + req.file.filename,
      uploadedBy: uploadedBy || undefined // Use undefined instead of null for optional ObjectId
    });
    
    await policy.save();
    console.log('Policy saved successfully:', policy._id);
    
    // Populate uploadedBy for response
    const populatedPolicy = await PolicyDoc.findById(policy._id)
      .populate({ path: 'uploadedBy', select: 'firstname lastname' });
    
    res.status(201).json({
      _id: populatedPolicy._id,
      title: populatedPolicy.title,
      description: populatedPolicy.description,
      uploadedBy: populatedPolicy.uploadedBy ? (populatedPolicy.uploadedBy.firstname + ' ' + populatedPolicy.uploadedBy.lastname) : 'Admin',
      uploadedAt: populatedPolicy.uploadedAt,
      fileUrl: 'http://localhost:5050' + populatedPolicy.filePath,
    });
  } catch (err) {
    console.error('Policy upload error:', err);
    res.status(400).json({ error: 'Failed to upload policy', details: err.message });
  }
});

app.delete('/api/policies/:id', async (req, res) => {
  try {
    const policy = await PolicyDoc.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    // Delete the physical file
    const filePath = path.join(__dirname, policy.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await PolicyDoc.findByIdAndDelete(req.params.id);
    res.json({ message: 'Policy deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});
// --- End Policy Endpoints ---

// GET endpoint to fetch all sessions for an employee
app.get('/api/sessions', async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });
    const sessions = await Session.find({ employeeId }).sort({ startTime: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Standard Payroll API Endpoints ---

// Get calculated payroll for a specific employee (using percentage-based calculation)
app.get('/api/employees/:id/payroll', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get the current payroll standards
    const standards = await getStandardPayrollItems();
    
    // Calculate payroll using the standardized function
    const payrollDetails = calculateEmployeePayroll(employee, standards);

    res.json({
      employeeId: employee.employeeId,
      name: employee.firstname + ' ' + employee.lastname,
      ...payrollDetails
    });
  } catch (error) {
    console.error('Error calculating employee payroll:', error);
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

// --- End Standard Payroll API Endpoints ---

server.listen(PORT, async () => {
  console.log('Server is running on port ' + PORT);
  
  // Initialize payroll standards if not already present
  await initializePayrollStandards();
});

