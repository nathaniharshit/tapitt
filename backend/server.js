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

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible globally
global._io = io;

const MONGODB_URI = 'mongodb+srv://ADH:HELLO@employeemanagement.9tmhw4a.mongodb.net/?retryWrites=true&w=majority&appName=EmployeeManagement';

const sessionSchema = new mongoose.Schema({
  employeeId: String, // This can be any user ID, not just employees
  employeeName: String,
  role: String, // Store user role for filtering and permission checks
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: null } // Add endTime for session end
});
const Session = mongoose.model('Session', sessionSchema);

// Configure CORS first, before any routes or middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Add express.json() middleware at the very top, before any routes
app.use(express.json());

app.post('/api/session/start', async (req, res) => {
  const { employeeName, employeeId, role } = req.body || {};

  try {
    // Save session to database with user role
    const session = new Session({
      employeeId: employeeId,
      employeeName: employeeName,
      role: role || 'employee', // Default to employee if no role provided
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

// Endpoint to get sessions for any user (employee, admin, manager, etc.)
app.get('/api/sessions', async (req, res) => {
  try {
    const { employeeId, userId, role, date, page, limit } = req.query;
    
    // Date filter for specific day if provided
    let dateFilter = {};
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      dateFilter = {
        startTime: {
          $gte: targetDate,
          $lt: nextDay
        }
      };
    }
    
    // Pagination setup
    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 100;
    const skip = (pageNum - 1) * pageSize;
    
    // If specific user ID is provided (can be any role, not just employees)
    const userIdToFetch = employeeId || userId;
    if (userIdToFetch) {
      const filter = { employeeId: userIdToFetch, ...dateFilter };
      const sessions = await Session.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(pageSize);
      
      // Calculate session statistics for this user
      const completedSessions = sessions.filter(s => s.endTime);
      let totalDuration = 0;
      
      completedSessions.forEach(session => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        totalDuration += (end - start);
      });
      
      return res.json({ 
        success: true, 
        sessions,
        activeSession: sessions.find(s => !s.endTime) || null,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: await Session.countDocuments(filter)
        },
        stats: {
          totalSessions: sessions.length,
          completedSessions: completedSessions.length,
          activeSessions: sessions.length - completedSessions.length,
          totalDuration // in milliseconds
        }
      });
    }
    
    // If no specific user ID but role is admin/superadmin/manager, return all sessions
    if (role === 'admin' || role === 'superadmin' || role === 'manager') {
      // Return all sessions with pagination
      const filter = { ...dateFilter };
      const allSessions = await Session.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(pageSize);
      
      const activeSessions = await Session.find({ 
        ...filter,
        endTime: null 
      }).sort({ startTime: -1 });
      
      // Get unique employee count
      const uniqueEmployees = new Set();
      allSessions.forEach(session => uniqueEmployees.add(session.employeeId));
      
      // Count total duration of all completed sessions
      let totalDuration = 0;
      allSessions.filter(s => s.endTime).forEach(session => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        totalDuration += (end - start);
      });
      
      return res.json({
        success: true,
        sessions: allSessions,
        activeSessions: activeSessions,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: await Session.countDocuments(filter)
        },
        stats: {
          totalSessions: allSessions.length,
          uniqueEmployees: uniqueEmployees.size,
          activeSessions: activeSessions.length,
          totalDuration
        }
      });
    }
    
    // If no valid parameters are provided, return an error
    return res.status(400).json({ 
      error: 'Either employeeId, userId query parameter or admin/manager role is required',
      usage: 'Use ?employeeId=X for specific employee, ?userId=X for any user, or include role=admin|superadmin|manager for all sessions'
    });
    
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch sessions', 
      details: error.message 
    });
  }
});

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    // Initialize default payroll standards in Settings if not exists
    await initializePayrollStandards();
    // Initialize default leave allocations in Settings if not exists  
    await initializeLeaveAllocations();
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
  type: { type: String, enum: ['Sick', 'Casual', 'Paid', 'Unpaid'], required: true },
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

// --- Yearly Leave Model (Financial Year Based) ---
const yearlyLeaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true }, // Financial year (April to March)
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
    sick: { type: Number, default: 0 }, // Always 0 - sick leaves don't carry forward
    casual: { type: Number, default: 0 }, // Always 0 - casual leaves don't carry forward
    paid: { type: Number, default: 0 } // Can carry forward for 1 year max
  }
}, { timestamps: true });

// Compound index for efficient queries
yearlyLeaveSchema.index({ employee: 1, year: 1 }, { unique: true });

const YearlyLeave = mongoose.model('YearlyLeave', yearlyLeaveSchema);
// --- End Yearly Leave Model ---

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

// --- Settings Model ---
const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed // Allow flexible value structure for different setting types
});
const Settings = mongoose.model('Settings', settingsSchema);
// --- End Settings Model ---

// --- Leave Allocation Settings Functions ---
async function getLeaveAllocations() {
  try {
    const settings = await Settings.findOne({ key: 'leave_allocations' });
    if (!settings) {
      return { sick: 2, casual: 2, paid: 2 }; // Default values
    }
    return settings.value || { sick: 2, casual: 2, paid: 2 };
  } catch (error) {
    console.error('Error fetching leave allocations:', error);
    return { sick: 2, casual: 2, paid: 2 }; // Default fallback
  }
}

async function initializeLeaveAllocations() {
  try {
    const exists = await Settings.findOne({ key: 'leave_allocations' });
    if (!exists) {
      await Settings.create({
        key: 'leave_allocations',
        value: { sick: 2, casual: 2, paid: 2 }
      });
      console.log('Initialized default leave allocations in Settings.');
    }
  } catch (error) {
    console.error('Error initializing leave allocations:', error);
  }
}

// --- Payroll Settings Functions ---
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
// --- End Settings and Utility Functions ---

// Now require middleware (after models are registered, before any routes)
const authorizeRoles = require('./middleware/rbac');
const authorizePermission = require('./middleware/permission');

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

// Calculate number of working days (excluding weekends) between two dates
function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  
  return count;
}

// Get or create quarterly leave record
async function getOrCreateQuarterlyLeave(employeeId, year, quarter) {
  let quarterlyLeave = await QuarterlyLeave.findOne({ employee: employeeId, year, quarter });
  
  if (!quarterlyLeave) {
    // Get dynamic leave allocations from settings
    const leaveAllocations = await getLeaveAllocations();
    
    // Create new quarterly leave record with dynamic allocations
    quarterlyLeave = new QuarterlyLeave({
      employee: employeeId,
      year,
      quarter,
      allocated: leaveAllocations,
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

// --- Financial Year Leave Utility Functions ---

// Get current financial year (April to March)
function getCurrentFinancialYear(date = new Date()) {
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

// Get or create yearly leave record
async function getOrCreateYearlyLeave(employeeId, year) {
  let yearlyLeave = await YearlyLeave.findOne({ employee: employeeId, year });
  
  if (!yearlyLeave) {
    // Get dynamic leave allocations from settings
    const leaveAllocations = await getLeaveAllocations();
    
    // Create new yearly leave record with dynamic allocations
    yearlyLeave = new YearlyLeave({
      employee: employeeId,
      year,
      allocated: leaveAllocations,
      used: { sick: 0, casual: 0, paid: 0 },
      carriedForward: { sick: 0, casual: 0, paid: 0 }
    });
    await yearlyLeave.save();
  }
  
  return yearlyLeave;
}

// Calculate available leave balance for each type in financial year
function calculateAvailableYearlyLeaves(yearlyLeave) {
  const available = {};
  ['sick', 'casual', 'paid'].forEach(type => {
    const allocated = yearlyLeave.allocated[type] || 0;
    const carriedForward = yearlyLeave.carriedForward[type] || 0;
    const used = yearlyLeave.used[type] || 0;
    available[type] = allocated + carriedForward - used;
  });
  return available;
}

// Process yearly carry forward for paid leave only (one year max)
async function processYearlyCarryForward(employeeId, fromYear) {
  const toYear = fromYear + 1;
  
  const fromYearlyLeave = await YearlyLeave.findOne({ 
    employee: employeeId, 
    year: fromYear 
  });
  
  if (!fromYearlyLeave) return;
  
  const available = calculateAvailableYearlyLeaves(fromYearlyLeave);
  const toYearlyLeave = await getOrCreateYearlyLeave(employeeId, toYear);
  
  // Only carry forward unused PAID leaves (sick and casual reset each year)
  const paidCarryForward = available.paid > 0 ? available.paid : 0;
  toYearlyLeave.carriedForward.paid = paidCarryForward;
  toYearlyLeave.carriedForward.sick = 0; // Reset sick leaves
  toYearlyLeave.carriedForward.casual = 0; // Reset casual leaves
  
  await toYearlyLeave.save();
  
  console.log(`Carried forward ${paidCarryForward} paid leaves from ${fromYear} to ${toYear} for employee ${employeeId}`);
}

// --- End Financial Year Leave Utility Functions ---

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
    
    // Validate notice period for different leave types
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    
    // Calculate working days between today and the leave start date
    const workingDaysBetween = calculateWorkingDays(today, fromDate);
    
    // Apply different notice period requirements based on leave type
    if (type.toLowerCase() === 'casual' && workingDaysBetween < 5) {
      return res.status(400).json({ 
        error: 'Casual leave requires a minimum of 5 working days\' prior notice.' 
      });
    } else if (type.toLowerCase() === 'paid' && workingDaysBetween < 15) {
      return res.status(400).json({ 
        error: 'Paid leave requires a minimum of 15 working days\' prior notice.' 
      });
    }
    
    // Calculate leave days and financial quarter
    const days = calculateLeaveDays(from, to);
    const { quarter, year } = getCurrentFinancialQuarter(new Date(from));
    
    // Skip balance checking for unpaid leaves
    if (type.toLowerCase() !== 'unpaid') {
      // Get or create quarterly leave record for financial quarter
      const quarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
      
      // Check if employee has enough leave balance
      const available = calculateAvailableLeaves(quarterlyLeave);
      const leaveType = type.toLowerCase();
      
      if (available[leaveType] < days) {
        return res.status(400).json({ 
          error: `Insufficient ${type} leave balance. Available: ${available[leaveType]}, Requested: ${days}` 
        });
      }
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
      
      // Validate notice period for different leave types when updating
      if (from !== leave.from || type !== leave.type) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        
        // Calculate working days between today and the leave start date
        const workingDaysBetween = calculateWorkingDays(today, fromDate);
        
        // Apply different notice period requirements based on leave type
        if (type.toLowerCase() === 'casual' && workingDaysBetween < 5) {
          return res.status(400).json({ 
            error: 'Casual leave requires a minimum of 5 working days\' prior notice.' 
          });
        } else if (type.toLowerCase() === 'paid' && workingDaysBetween < 15) {
          return res.status(400).json({ 
            error: 'Paid leave requires a minimum of 15 working days\' prior notice.' 
          });
        }
      }
      
      // Calculate new leave days and financial quarter
      const newDays = calculateLeaveDays(from, to);
      const { quarter, year } = getCurrentFinancialQuarter(new Date(from));
      
      // Skip balance checking for unpaid leaves
      if (type.toLowerCase() !== 'unpaid') {
        // Get quarterly leave record for financial quarter
        const quarterlyLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
        
        // Check if employee has enough leave balance (considering the current leave being edited)
        const available = calculateAvailableLeaves(quarterlyLeave);
        const leaveType = type.toLowerCase();
        const currentLeaveType = leave.type.toLowerCase();
        
        // Add back the current leave days to available balance if same type
        let adjustedAvailable = available[leaveType];
        if (currentLeaveType === leaveType && currentLeaveType !== 'unpaid') {
          adjustedAvailable += leave.days;
        }
        
        if (adjustedAvailable < newDays) {
          return res.status(400).json({ 
            error: `Insufficient ${type} leave balance. Available: ${adjustedAvailable}, Requested: ${newDays}` 
          });
        }
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

      // Skip quarterly leave balance updates for unpaid leaves
      if (leave.type.toLowerCase() !== 'unpaid') {
        // Update quarterly leave balance based on status change
        const quarterlyLeave = await getOrCreateQuarterlyLeave(leave.employee, leave.year, leave.quarter);
        const leaveType = leave.type.toLowerCase();
        
        if (status === 'Approved' && oldStatus !== 'Approved') {
          // Deduct from available balance
          quarterlyLeave.used[leaveType] = (quarterlyLeave.used[leaveType] || 0) + leave.days;
          await quarterlyLeave.save();
        } else if (status === 'Rejected' && oldStatus === 'Approved') {
          // Add back to available balance
          quarterlyLeave.used[leaveType] = Math.max(0, (quarterlyLeave.used[leaveType] || 0) - leave.days);
          await quarterlyLeave.save();
        }
      }
      
      // Mark attendance as present for each date in the leave range (for all approved leaves)
      if (status === 'Approved' && oldStatus !== 'Approved') {
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
    
    // Get or create quarterly leave record for current financial quarter
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
      currentFinancialYear: `${year}-${year + 1}`,
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
// Keep financial year endpoint for backward compatibility but redirect to quarterly logic
app.get('/api/leaves/:employeeId/financial-year-balance', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { quarter, year } = getCurrentFinancialQuarter();
    
    // Get or create quarterly leave record for current financial quarter
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
      currentFinancialYear: `${year}-${year + 1}`,
      currentQuarter: `${year}-${quarter}`,
      available,
      breakdown,
      yearlyLeave: {
        year,
        quarter,
        allocated: quarterlyLeave.allocated,
        used: quarterlyLeave.used,
        carriedForward: quarterlyLeave.carriedForward
      }
    });
  } catch (err) {
    console.error('Financial year balance error:', err);
    res.status(500).json({ error: 'Failed to fetch financial year balance' });
  }
});

// Debug endpoint to check leave allocation status and quarterly records
app.get('/api/debug/leave-status/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { quarter, year } = getCurrentFinancialQuarter();
    
    // 1. Check current leave allocations in settings
    const currentAllocations = await getLeaveAllocations();
    
    // 2. Check employee's current quarterly leave record
    const currentQuarterLeave = await QuarterlyLeave.findOne({ 
      employee: employeeId, 
      year, 
      quarter 
    });
    
    // 3. Get all quarterly leave records for this employee
    const allQuarterlyLeaves = await QuarterlyLeave.find({ 
      employee: employeeId 
    }).sort({ year: -1, quarter: -1 });
    
    // 4. Calculate current available leaves
    let availableLeaves = null;
    if (currentQuarterLeave) {
      availableLeaves = calculateAvailableLeaves(currentQuarterLeave);
    }
    
    // 5. Check employee info
    const employee = await Employee.findById(employeeId, 'firstname lastname email');
    
    res.json({
      debug: true,
      timestamp: new Date().toISOString(),
      currentQuarter: `${year}-${quarter}`,
      employee: employee || { error: 'Employee not found' },
      
      // Current system settings
      systemAllocations: currentAllocations,
      
      // Current quarter record
      currentQuarterRecord: currentQuarterLeave || { error: 'No current quarter record found' },
      
      // All historical records
      allQuarterlyRecords: allQuarterlyLeaves,
      
      // Calculated available leaves
      calculatedAvailable: availableLeaves || { error: 'Cannot calculate - no current quarter record' },
      
      // Status checks
      checks: {
        settingsExist: !!currentAllocations,
        currentQuarterExists: !!currentQuarterLeave,
        allocationsMatch: currentQuarterLeave ? 
          JSON.stringify(currentQuarterLeave.allocated) === JSON.stringify(currentAllocations) :
          false,
        totalRecords: allQuarterlyLeaves.length
      }
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    res.status(500).json({ 
      error: 'Debug failed', 
      details: err.message,
      stack: err.stack 
    });
  }
});

// Debug endpoint to force refresh a specific employee's current quarter record
app.post('/api/debug/refresh-quarter/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { quarter, year } = getCurrentFinancialQuarter();
    
    // Get current allocations from settings
    const newAllocations = await getLeaveAllocations();
    
    // Find and update current quarter record
    const currentQuarterLeave = await QuarterlyLeave.findOne({ 
      employee: employeeId, 
      year, 
      quarter 
    });
    
    if (currentQuarterLeave) {
      // Update the allocated amounts with new settings
      const oldAllocated = { ...currentQuarterLeave.allocated };
      currentQuarterLeave.allocated = newAllocations;
      await currentQuarterLeave.save();
      
      res.json({
        message: 'Quarter record refreshed successfully',
        employeeId,
        quarter: `${year}-${quarter}`,
        changes: {
          before: oldAllocated,
          after: newAllocations
        },
        updatedRecord: currentQuarterLeave
      });
    } else {
      // Create new quarter record if it doesn't exist
      const newQuarterLeave = await getOrCreateQuarterlyLeave(employeeId, year, quarter);
      
      res.json({
        message: 'New quarter record created',
        employeeId,
        quarter: `${year}-${quarter}`,
        newRecord: newQuarterLeave
      });
    }
  } catch (err) {
    console.error('Refresh quarter error:', err);
    res.status(500).json({ 
      error: 'Refresh failed', 
      details: err.message 
    });
  }
});

// --- End Debug Endpoints ---

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

// --- Payroll Management Endpoints ---
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

// --- Leave Allocation Management Endpoints ---
app.get('/api/leave-allocations', async (req, res) => {
  try {
    const allocations = await getLeaveAllocations();
    res.json(allocations);
  } catch (error) {
    console.error('Error fetching leave allocations:', error);
    res.status(500).json({ error: 'Failed to fetch leave allocations' });
  }
});

app.post('/api/leave-allocations', async (req, res) => {
  try {
    const { sick, casual, paid } = req.body;
    
    // Validate input
    if (typeof sick !== 'number' || typeof casual !== 'number' || typeof paid !== 'number') {
      return res.status(400).json({ error: 'All leave types must be numbers' });
    }
    
    if (sick < 0 || casual < 0 || paid < 0) {
      return res.status(400).json({ error: 'Leave allocations cannot be negative' });
    }
    
    // Update leave allocations in settings
    const settings = await Settings.findOneAndUpdate(
      { key: 'leave_allocations' },
      { value: { sick, casual, paid } },
      { new: true, upsert: true }
    );
    
    res.json({
      message: 'Leave allocations updated successfully',
      allocations: settings.value
    });
  } catch (error) {
    console.error('Error updating leave allocations:', error);
    res.status(500).json({ error: 'Failed to update leave allocations' });
  }
});

// Apply new leave allocations to future quarters (optional endpoint for mass updates)
app.post('/api/leave-allocations/apply-to-future', async (req, res) => {
  try {
    const newAllocations = await getLeaveAllocations();
    const { quarter, year } = getCurrentFinancialQuarter();
    const employees = await Employee.find({});
    let updated = 0;
    for (const employee of employees) {
      // Use getOrCreateQuarterlyLeave to ensure record exists
      const currentQuarterLeave = await getOrCreateQuarterlyLeave(employee._id, year, quarter);
      currentQuarterLeave.allocated = newAllocations;
      await currentQuarterLeave.save();
      updated++;
    }
    res.json({
      message: `Applied new leave allocations to ${updated} employee(s) for current quarter ${year}-${quarter}`,
      updated,
      allocations: newAllocations,
      appliedTo: `${year}-${quarter}`
    });
  } catch (error) {
    console.error('Error applying leave allocations:', error);
    res.status(500).json({ error: 'Failed to apply new leave allocations' });
  }
});
// --- End Payroll and Leave Management Endpoints ---

// --- End Standard Payroll API Endpoints ---

server.listen(PORT, async () => {
  console.log('Server is running on port ' + PORT);
  
  // Initialize payroll standards if not already present
  await initializePayrollStandards();
  // Initialize leave allocations if not present
  await initializeLeaveAllocations();
});

// --- Employee Management & Authentication Endpoints ---

// Get employee salary/payroll information
app.get('/api/employees/:id/salary', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get standard payroll items to recalculate if needed
    const standardPayroll = await getStandardPayrollItems();
    
    // If employee doesn't have payroll data, calculate it
    if (!employee.allowances || !employee.deductions) {
      const payrollData = calculateEmployeePayroll(employee, standardPayroll);
      
      // Update employee with calculated payroll data
      await Employee.findByIdAndUpdate(req.params.id, {
        allowances: payrollData.allowances,
        deductions: payrollData.deductions
      });
      
      return res.json({
        employeeId: employee._id,
        name: `${employee.firstname} ${employee.lastname}`,
        basicSalary: employee.salary || 0,
        allowances: payrollData.allowances,
        deductions: payrollData.deductions,
        totalAllowances: payrollData.totalAllowances,
        totalDeductions: payrollData.totalDeductions,
        grossSalary: payrollData.grossSalary,
        netSalary: payrollData.netSalary
      });
    }

    // Return existing payroll data
    const basicSalary = employee.salary || 0;
    const totalAllowances = (employee.allowances || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDeductions = (employee.deductions || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    res.json({
      employeeId: employee._id,
      name: `${employee.firstname} ${employee.lastname}`,
      basicSalary: Math.round(basicSalary * 100) / 100,
      allowances: employee.allowances || [],
      deductions: employee.deductions || [],
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    });
    
  } catch (err) {
    console.error('Error fetching employee salary:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee payroll information (alias for salary endpoint)
app.get('/api/employees/:id/payroll', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get standard payroll items to recalculate if needed
    const standardPayroll = await getStandardPayrollItems();
    
    // If employee doesn't have payroll data, calculate it
    if (!employee.allowances || !employee.deductions) {
      const payrollData = calculateEmployeePayroll(employee, standardPayroll);
      
      // Update employee with calculated payroll data
      await Employee.findByIdAndUpdate(req.params.id, {
        allowances: payrollData.allowances,
        deductions: payrollData.deductions
      });
      
      return res.json({
        employeeId: employee._id,
        name: `${employee.firstname} ${employee.lastname}`,
        basicSalary: (employee.salary || 0) / 12, // Monthly basic salary
        allowances: payrollData.allowances,
        deductions: payrollData.deductions,
        totalAllowances: payrollData.totalAllowances,
        totalDeductions: payrollData.totalDeductions,
        grossSalary: payrollData.grossSalary,
        netSalary: payrollData.netSalary
      });
    }

    // Return existing payroll data
    const annualSalary = employee.salary || 0;
    const basicSalary = annualSalary / 12; // Monthly basic salary
    const totalAllowances = (employee.allowances || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalDeductions = (employee.deductions || []).reduce((sum, item) => sum + (item.amount || 0), 0);
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    // Add percentage information to existing allowances and deductions
    const allowancesWithPercentage = (employee.allowances || []).map(allowance => {
      const stdAllowance = standardPayroll.allowances?.find(std => std.name === allowance.name);
      return {
        name: allowance.name,
        amount: allowance.amount,
        percentage: stdAllowance?.percentage || 0,
        calculationType: 'percentage'
      };
    });

    const deductionsWithPercentage = (employee.deductions || []).map(deduction => {
      const stdDeduction = standardPayroll.deductions?.find(std => std.name === deduction.name);
      return {
        name: deduction.name,
        amount: deduction.amount,
        percentage: stdDeduction?.percentage || 0,
        calculationType: 'percentage'
      };
    });

    res.json({
      employeeId: employee._id,
      name: `${employee.firstname} ${employee.lastname}`,
      basicSalary: Math.round(basicSalary * 100) / 100, // Monthly basic salary
      allowances: allowancesWithPercentage,
      deductions: deductionsWithPercentage,
      totalAllowances: Math.round(totalAllowances * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100
    });
    
  } catch (err) {
    console.error('Error fetching employee payroll:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all employees
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

// Delete employee
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

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, employeeId, password } = req.body;
  
  // Accept either employeeId or email for login, but prioritize employeeId
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
    
    res.json({ 
      message: 'Login successful', 
      employee: {
        _id: employee._id,
        email: employee.email,
        role: employee.role,
        mustChangePassword: employee.mustChangePassword,
        firstname: employee.firstname,
        lastname: employee.lastname,
        lastLogin: employee.lastLogin,
        roleRef: employeeWithRole.roleRef // includes name and permissions
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set password endpoint
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
    if ((employee.attendance || []).some(att => att.date === date)) {
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

// --- End Employee Management & Authentication Endpoints ---

// --- Payroll Endpoints ---

// Generate and download payslip
app.get('/api/employees/:id/payslip', async (req, res) => {
  try {
    const { id } = req.params;
    const { month } = req.query;
    
    if (!id || !month) {
      return res.status(400).json({ error: 'Employee ID and month are required' });
    }
    
    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Get employee's salary info
    const standardPayroll = await getStandardPayrollItems();
    let payrollData;
    
    if (!employee.allowances || !employee.deductions) {
      payrollData = calculateEmployeePayroll(employee, standardPayroll);
    } else {
      payrollData = {
        allowances: employee.allowances,
        deductions: employee.deductions,
        totalAllowances: Object.values(employee.allowances || {}).reduce((sum, val) => sum + val, 0),
        totalDeductions: Object.values(employee.deductions || {}).reduce((sum, val) => sum + val, 0),
        grossSalary: (employee.salary || 0) / 12 + Object.values(employee.allowances || {}).reduce((sum, val) => sum + val, 0),
        netSalary: ((employee.salary || 0) / 12) 
                   + Object.values(employee.allowances || {}).reduce((sum, val) => sum + val, 0)
                   - Object.values(employee.deductions || {}).reduce((sum, val) => sum + val, 0)
      };
    }
    
    // Parse month format (YYYY-MM)
    const [year, monthNum] = month.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
    
    // Create PDF document
    const doc = new PDFDocument();
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip_${id}_${month}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Build the PDF content
    doc.fontSize(20).text('TAPITT TECHNOLOGIES', { align: 'center' });
    doc.fontSize(16).text(`Employee Payslip - ${monthName} ${year}`, { align: 'center' });
    doc.moveDown();
    
    // Employee details section
    doc.fontSize(12).text('Employee Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Name: ${employee.firstname} ${employee.lastname}`);
    doc.fontSize(10).text(`Employee ID: ${employee._id}`);
    doc.fontSize(10).text(`Department: ${employee.department || 'N/A'}`);
    doc.fontSize(10).text(`Designation: ${employee.designation || 'N/A'}`);
    doc.moveDown();
    
    // Salary details
    doc.fontSize(12).text('Salary Details', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Basic Salary: ₹${((employee.salary || 0) / 12).toFixed(2)}`);
    
    // Allowances
    doc.moveDown();
    doc.fontSize(12).text('Allowances', { underline: true });
    doc.moveDown(0.5);
    for (const [key, value] of Object.entries(payrollData.allowances || {})) {
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      doc.fontSize(10).text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ₹${numValue.toFixed(2)}`);
    }
    const totalAllowances = typeof payrollData.totalAllowances === 'number' ? payrollData.totalAllowances : 0;
    doc.fontSize(10).text(`Total Allowances: ₹${totalAllowances.toFixed(2)}`);
    
    // Deductions
    doc.moveDown();
    doc.fontSize(12).text('Deductions', { underline: true });
    doc.moveDown(0.5);
    for (const [key, value] of Object.entries(payrollData.deductions || {})) {
      const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      doc.fontSize(10).text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ₹${numValue.toFixed(2)}`);
    }
    const totalDeductions = typeof payrollData.totalDeductions === 'number' ? payrollData.totalDeductions : 0;
    doc.fontSize(10).text(`Total Deductions: ₹${totalDeductions.toFixed(2)}`);
    
    // Summary
    doc.moveDown();
    doc.fontSize(12).text('Payment Summary', { underline: true });
    doc.moveDown(0.5);
    const grossSalary = typeof payrollData.grossSalary === 'number' ? payrollData.grossSalary : 0;
    const netSalary = typeof payrollData.netSalary === 'number' ? payrollData.netSalary : 0;
    doc.fontSize(10).text(`Gross Salary: ₹${grossSalary.toFixed(2)}`);
    doc.fontSize(10).text(`Net Salary: ₹${netSalary.toFixed(2)}`);
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('This is a computer-generated document. No signature required.', { align: 'center' });
    doc.fontSize(8).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating payslip:', error);
    
    // Check if headers have been sent to avoid "write after end" errors
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate payslip' });
    } else {
      // If headers already sent, just end the response
      try {
        res.end();
      } catch (err) {
        console.error('Error ending response:', err);
      }
    }
  }
});

// --- Standard API Endpoints ---

