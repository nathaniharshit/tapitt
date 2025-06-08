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
  employmentType: {
    type: String,
    enum: ['employee', 'intern'],
    required: true
  }
}, { timestamps: true }); // <-- Add this option

const Employee = mongoose.model('Employee', employeeSchema);

// Team schema and model
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now }
});
const Team = mongoose.model('Team', teamSchema);

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
  'linkedin', 'github', 'status', 'picture', 'employmentType'
];

app.post('/api/employees', async (req, res) => {
  try {
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(400).json({ error: 'A temporary password of at least 8 characters is required.' });
    }
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    // Only pick allowed fields
    const employeeData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') employeeData[field] = req.body[field];
    });
    employeeData.password = hashedPassword;
    employeeData.mustChangePassword = true;
    // Ensure employmentType is always set (default to 'employee' if not provided)
    if (!employeeData.employmentType) employeeData.employmentType = 'employee';
    const employee = new Employee(employeeData);
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    // Explicitly select createdAt and updatedAt fields
    const employees = await Employee.find().select('+createdAt +updatedAt');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update employee with file upload
app.put('/api/employees/:id', upload.fields([
  { name: 'picture', maxCount: 1 }
  // Remove aadhar from multer fields
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
    // Ensure employmentType is always set (default to 'employee' if not provided)
    if (!updateData.employmentType) updateData.employmentType = 'employee';
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
    const employee = await Employee.findOne({ email });
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
    const { email, password } = req.body;
    try {
      const employee = await Employee.findOne({ email });
      if (employee) {
        const today = new Date();
        const dateStr = today.toISOString().substring(0, 10); // YYYY-MM-DD
        if (!employee.attendance) employee.attendance = [];
        if (!employee.attendance.includes(dateStr)) {
          employee.attendance.push(dateStr);
          await employee.save();
        }
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  }
  next();
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

// Create a new team
app.post('/api/teams', async (req, res) => {
  try {
    let { name, members, createdBy } = req.body;
    console.log('POST /api/teams', { name, members, createdBy, typeofMembers: typeof members });

    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Team name and createdBy are required.' });
    }

    // If members is undefined/null/empty, use empty array
    if (!members) members = [];
    // If members is a string (single select), convert to array
    if (typeof members === 'string') {
      try {
        // Try to parse as JSON array (if frontend sends as stringified array)
        const parsed = JSON.parse(members);
        if (Array.isArray(parsed)) {
          members = parsed;
        } else if (members.trim() !== '') {
          members = [members];
        } else {
          members = [];
        }
      } catch {
        if (members.trim() !== '') {
          members = [members];
        } else {
          members = [];
        }
      }
    }
    // Ensure members is an array of non-empty strings
    if (!Array.isArray(members)) members = [];
    members = members.filter(id => typeof id === 'string' && id.trim() !== '');

    // Convert to ObjectIds
    try {
      members = members.map(id => mongoose.Types.ObjectId(id));
    } catch (err) {
      return res.status(400).json({ error: 'Invalid member ID(s).' });
    }

    // Validate createdBy
    try {
      createdBy = mongoose.Types.ObjectId(createdBy);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid createdBy ID.' });
    }

    const team = new Team({
      name,
      members,
      createdBy
    });
    await team.save();
    res.status(201).json(team);
  } catch (err) {
    console.error('Error creating team:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get all teams (optionally filter by createdBy)
app.get('/api/teams', async (req, res) => {
  try {
    const filter = {};
    if (req.query.createdBy) {
      filter.createdBy = req.query.createdBy;
    }
    const teams = await Team.find(filter).populate('members', 'firstname lastname email department');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all teams an employee is a member of
app.get('/api/teams/member/:employeeId', async (req, res) => {
  try {
    const teams = await Team.find({ members: req.params.employeeId }).populate('members', 'firstname lastname email department');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
