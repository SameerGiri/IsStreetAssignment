// Install required dependencies
// npm install express mongoose jsonwebtoken bcryptjs cors dotenv

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('User', UserSchema);

const EmployeeSchema = new mongoose.Schema({
  name: String,
  position: String,
});
const Employee = mongoose.model('Employee', EmployeeSchema);

const AssignmentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

// Register User
app.post('/register-user', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'User already exists' });
  }
});

// Login User
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, userId: user._id, name: user.name });
});

// Middleware to verify JWT Token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(403).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get Users (Protected)
app.get('/users', verifyToken, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Add Employee (Protected)
app.post('/add-employee', verifyToken, async (req, res) => {
  const employee = await Employee.create(req.body);
  res.status(201).json(employee);
});

// Get Employees with Pagination (Protected)
app.get('/employees', verifyToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const employees = await Employee.find()
    .limit(limit * 1)
    .skip((page - 1) * limit);
  res.json(employees);
});

// Create Assignment (Protected)
app.post('/create-assignment', verifyToken, async (req, res) => {
  const assignment = await Assignment.create(req.body);
  res.status(201).json(assignment);
});

// Get Assignments (Protected)
app.get('/assignments', verifyToken, async (req, res) => {
  const assignments = await Assignment.find();
  res.json(assignments);
});

// Get Assignments by User ID (Protected)
app.get('/assignments/:userId', verifyToken, async (req, res) => {
  const assignments = await Assignment.find({ userId: req.params.userId });
  res.json(assignments);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
