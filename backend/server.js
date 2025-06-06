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
  department: String,
  position: String,
  role: String,
  salary: Number,
  startDate: Date,
  address: String,
  status: { type: String, default: 'active' },
  password: { type: String, default: '' },
  mustChangePassword: { type: Boolean, default: true },
  // Additional fields for personal info
  aadhar: String, // Now just the number, not a file/photo
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
  picture: String, // Store as URL or base64 string
  lastLogin: Date,
  clockInTime: Date,
  clockOutTime: Date,
  attendance: [String], // Array of date strings (YYYY-MM-DD)
  employmentType: {
    type: String,
    enum: ['employee', 'intern'],
    required: true
  }
});  

const Employee = mongoose.model('Employee', employeeSchema);
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

app.post('/api/employees', async (req, res) => {
  try {
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(400).json({ error: 'A temporary password of at least 8 characters is required.' });
    }
    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const employee = new Employee({ ...req.body, password: hashedPassword, mustChangePassword: true });
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
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
    let updateData = { ...req.body };
    // Multer fields: req.body fields are always strings, so fix arrays/objects if needed
    // If a profile picture was uploaded, set the picture field to the file URL
    if (req.files && req.files['picture']) {
      updateData.picture = `/uploads/${req.files['picture'][0].filename}`;
    }
    // Remove aadhar file upload logic
    // Fix: If using multipart/form-data, convert empty strings to undefined/null for optional fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') updateData[key] = undefined;
    });
    // Fix: If using multipart/form-data, numeric and boolean fields come as strings, so cast as needed
    if (updateData.salary) updateData.salary = Number(updateData.salary);
    if (updateData.mustChangePassword !== undefined) updateData.mustChangePassword = updateData.mustChangePassword === 'true' || updateData.mustChangePassword === true;
    // If no file, keep the existing picture if not provided
    if (!updateData.picture && req.body.existingPicture) {
      updateData.picture = req.body.existingPicture;
    }
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
