const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('./models/User');
const Student = require('./models/Student');
const Application = require('./models/Application');
const Exam = require('./models/Exam');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// إعداد multer لتخزين الصور في مجلد uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// جعل مجلد uploads متاحًا للوصول إلى الصور
app.use('/uploads', express.static('uploads'));

// الاتصال بـ MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/school-system';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Middleware للتحقق من JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.log('No token provided in Authorization header');
    return res.status(401).json({ error: 'Access denied, no token provided' });
  }
  try {
    const decoded = jwt.verify(token, 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Invalid token:', error.message);
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware للتحقق من دور DepartmentHead
const restrictToDepartmentHead = (req, res, next) => {
  if (req.user.role !== 'DepartmentHead') {
    console.log('Access denied: User role is not DepartmentHead');
    return res.status(403).json({ error: 'Access denied, only DepartmentHead allowed' });
  }
  next();
};

// Middleware للتحقق من دور Admin أو DepartmentHead
const restrictToAdminOrDepartmentHead = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'DepartmentHead') {
    console.log('Access denied: User role is neither Admin nor DepartmentHead');
    return res.status(403).json({ error: 'Access denied, only Admin or DepartmentHead allowed' });
  }
  next();
};

// Middleware للتحقق من دور Registrar
const restrictToRegistrar = (req, res, next) => {
  if (req.user.role !== 'Registrar') {
    console.log('Access denied: User role is not Registrar');
    return res.status(403).json({ error: 'Access denied, only Registrar allowed' });
  }
  next();
};

// API لإنشاء مستخدم جديد
app.post('/api/users/register', async (req, res) => {
  console.log('Received POST request to /api/users/register:', req.body);
  const { username, password, role, department, division } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role, department, division });
    await user.save();
    console.log(`User ${username} created successfully with ID: ${user._id}`);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لتسجيل الدخول
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, department: user.department, division: user.division },
      'secret',
      { expiresIn: '1h' }
    );
    console.log(`User ${username} logged in successfully`);
    res.json({ token, role: user.role, department: user.department, division: user.division });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لإنشاء طالب جديد (محمي بـ JWT)
app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    console.log(`Student created successfully with ID: ${student._id}`);
    res.status(201).json({ message: 'Student created successfully', student });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لتسجيل طالب من قبل ولي الأمر (مفتوح)
app.post('/api/parent-register-student', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    console.log(`Student created successfully with ID: ${student._id}`);

    const application = new Application({ 
      studentId: student._id,
      division: req.body.division,
      stage: req.body.stage,
      level: req.body.level
    });
    await application.save();
    console.log(`Application created successfully with ID: ${application._id}`);

    student.applicationId = application._id;
    await student.save();
    console.log(`Student ${student._id} updated with application ID: ${application._id}`);

    res.status(201).json({ message: 'Student and application created successfully', student, application });
  } catch (error) {
    console.error('Error creating student and application:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لتحديث حالة الطلب (محمي بـ JWT)
app.put('/api/applications/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, exams } = req.body;
  try {
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (status) application.status = status;
    if (exams) application.exams = exams;
    await application.save();
    console.log(`Application ${id} updated successfully`);
    res.json({ message: 'Application updated successfully', application });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لجلب جميع الطلبات (محمي بـ JWT، متاح لـ Admin و DepartmentHead)
app.get('/api/applications', authenticateToken, restrictToAdminOrDepartmentHead, async (req, res) => {
  try {
    const applications = await Application.find().populate('studentId').lean();
    console.log(`Retrieved ${applications.length} applications`);

    if (req.user.role === 'DepartmentHead') {
      const filteredApplications = applications.filter(app => {
        const relevantExams = app.exams?.filter(
          exam => exam.subject === req.user.department
        );
        console.log(`Application ${app._id} - Relevant Exams:`, relevantExams);
        return relevantExams && relevantExams.length > 0 && app.division === req.user.division;
      });
      return res.json({
        message: 'Applications retrieved successfully',
        applications: filteredApplications
      });
    }

    res.json({
      message: 'Applications retrieved successfully',
      applications
    });
  } catch (error) {
    console.error('Error retrieving applications:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لجلب طلب فردي بناءً على المعرف (محمي بـ JWT، متاح لـ Admin و DepartmentHead)
app.get('/api/applications/:id', authenticateToken, restrictToAdminOrDepartmentHead, async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findById(id).populate('studentId').lean();
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    console.log(`Application ${id} retrieved successfully`);
    res.json({
      message: 'Application retrieved successfully',
      application
    });
  } catch (error) {
    console.error('Error retrieving application:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لإنشاء امتحان جديد (محمي بـ JWT، مقيد بـ DepartmentHead)
app.post('/api/exams', authenticateToken, restrictToDepartmentHead, upload.array('images'), async (req, res) => {
  console.log('Received POST request to /api/exams');
  try {
    const { subject, division, stage, level } = req.body;
    const questions = req.body.questions ? JSON.parse(req.body.questions) : [];

    console.log('User data from token:', req.user);
    if (req.user.department !== subject) {
      console.log(`Access denied: User department (${req.user.department}) does not match exam subject (${subject})`);
      return res.status(403).json({ error: 'You can only create exams for your department' });
    }

    if (!division || !stage || !level) {
      console.log('Missing required fields:', { division, stage, level });
      return res.status(400).json({ error: 'Division, Stage, and Level are required' });
    }

    if (!questions || questions.length === 0) {
      console.log('No questions provided');
      return res.status(400).json({ error: 'At least one question is required' });
    }

    console.log('Received data:', { subject, division, stage, level, questions });
    console.log('Uploaded files:', req.files);

    const files = req.files || [];
    let fileIndex = 0;
    questions.forEach((question, index) => {
      question.order = index + 1; // إضافة الترتيب
      if (files[fileIndex] && files[fileIndex].fieldname === 'images') {
        question.image = `/uploads/${files[fileIndex].filename}`;
        console.log(`Image added to question ${index + 1}: ${question.image}`);
        fileIndex++;
      } else {
        question.image = '';
        console.log(`No image for question ${index + 1}`);
      }
    });

    const exam = new Exam({ subject, questions, division, stage, level });
    await exam.save();
    console.log(`Exam created successfully with ID: ${exam._id}`);
    res.status(201).json({ message: 'Exam created successfully', exam });
  } catch (error) {
    console.error('Detailed error creating exam:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// API لجلب الامتحانات (مفتوح مؤقتًا)
app.get('/api/exams', async (req, res) => {
  const { division, stage, level, subject } = req.query;
  try {
    if (division && stage && level && subject) {
      const exam = await Exam.findOne({ division, stage, level, subject })
        .sort({ _id: -1 });
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      exam.questions.sort((a, b) => a.order - b.order);
      console.log(`Exam retrieved successfully for ${subject} (${division}, ${stage}, ${level})`);
      res.json({ message: 'Exam retrieved successfully', exam });
    } else {
      const exams = await Exam.find().sort({ _id: -1 });
      exams.forEach(exam => {
        exam.questions.sort((a, b) => a.order - b.order);
      });
      console.log(`Retrieved ${exams.length} exams`);
      res.json({ message: 'Exams retrieved successfully', exams });
    }
  } catch (error) {
    console.error('Error retrieving exams:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لحذف امتحان (محمي بـ JWT، مقيد بـ DepartmentHead)
app.delete('/api/exams/:id', authenticateToken, restrictToDepartmentHead, async (req, res) => {
  const { id } = req.params;
  try {
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    if (req.user.department !== exam.subject) {
      return res.status(403).json({ error: 'You can only delete exams for your department' });
    }
    await Exam.deleteOne({ _id: id });
    console.log(`Exam ${id} deleted successfully`);
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لإرسال وتصحيح إجابات الامتحان تلقائيًا (مفتوح مؤقتًا)
app.post('/api/applications/:id/submit-exam', async (req, res) => {
  const { id } = req.params;
  const { examId, answers } = req.body;
  try {
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    console.log('Exam questions before processing:', exam.questions);
    exam.questions.sort((a, b) => a.order - b.order);
    let score = 0;
    const totalQuestions = exam.questions.length;
    const results = exam.questions.map((question, index) => {
      const studentAnswer = answers[index] || '';
      const isCorrect = studentAnswer === question.correctAnswer;
      if (isCorrect) score++;
      console.log(`Question ${index + 1} image path:`, question.image);
      return {
        question: question.question,
        image: question.image || '',
        studentAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect
      };
    });
    console.log('Results after processing:', results);
    const percentageScore = (score / totalQuestions) * 100;
    const examResult = {
      subject: exam.subject,
      score: percentageScore,
      comments: `Auto-graded: ${score}/${totalQuestions} correct`,
      results,
      seenByDepartmentHead: false
    };
    application.exams = application.exams || [];
    application.exams.push(examResult);
    await application.save();
    console.log(`Application ${id} updated with exam result for ${exam.subject}`);
    res.json({ message: 'Exam submitted and graded successfully' });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لاستعراض نتائج الامتحانات للطلب (محمي بـ JWT، مقيد بـ Admin أو DepartmentHead)
app.get('/api/applications/:id/results', authenticateToken, restrictToAdminOrDepartmentHead, async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (req.user.role === 'DepartmentHead') {
      const departmentResults = application.exams.filter(exam => exam.subject === req.user.department);
      return res.json({
        message: 'Exam results retrieved successfully',
        results: departmentResults
      });
    }
    res.json({
      message: 'Exam results retrieved successfully',
      results: application.exams
    });
  } catch (error) {
    console.error('Error retrieving exam results:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لتحديث حالة seenByDepartmentHead (محمي بـ JWT، مقيد بـ DepartmentHead)
app.put('/api/applications/:id/mark-seen', authenticateToken, restrictToDepartmentHead, async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    application.exams = application.exams.map(exam => {
      if (exam.subject === req.user.department && !exam.seenByDepartmentHead) {
        return { ...exam, seenByDepartmentHead: true };
      }
      return exam;
    });
    await application.save();
    console.log(`Application ${id} marked as seen by DepartmentHead`);
    res.json({ message: 'Results marked as seen' });
  } catch (error) {
    console.error('Error marking results as seen:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لاستعراض بيانات تسجيل الطلاب (محمي بـ JWT، مقيد بـ Registrar)
app.get('/api/students', authenticateToken, restrictToRegistrar, async (req, res) => {
  try {
    const students = await Student.find().populate('applicationId').lean();
    const filteredStudents = students.map(student => {
      if (student.applicationId && student.applicationId.exams) {
        delete student.applicationId.exams;
      }
      return student;
    });
    console.log(`Retrieved ${filteredStudents.length} students for Registrar`);
    res.json({
      message: 'Students data retrieved successfully',
      students: filteredStudents
    });
  } catch (error) {
    console.error('Error retrieving students:', error);
    res.status(500).json({ error: error.message });
  }
});

// API لتعديل امتحان موجود (محمي بـ JWT، مقيد بـ Admin أو DepartmentHead)
app.put('/api/exams/:id', authenticateToken, restrictToAdminOrDepartmentHead, upload.array('images'), async (req, res) => {
  const { id } = req.params;
  let { subject, questions, division, stage, level } = req.body;

  try {
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    if (req.user.role === 'DepartmentHead' && req.user.department !== exam.subject) {
      return res.status(403).json({ error: 'You can only edit exams for your department' });
    }

    questions = questions ? JSON.parse(questions) : exam.questions;
    console.log('Received data:', { subject, division, stage, level, questions });
    console.log('Uploaded files:', req.files);

    const files = req.files || [];
    let fileIndex = 0;
    questions.forEach((question, index) => {
      question.order = index + 1;
      if (files[fileIndex] && files[fileIndex].fieldname === 'images') {
        question.image = `/uploads/${files[fileIndex].filename}`;
        console.log(`Image updated for question ${index + 1}: ${question.image}`);
        fileIndex++;
      } else if (!question.image) {
        question.image = '';
        console.log(`No image for question ${index + 1}`);
      }
    });

    if (subject) exam.subject = subject;
    exam.questions = questions;
    if (division) exam.division = division;
    if (stage) exam.stage = stage;
    if (level) exam.level = level;

    await exam.save();
    console.log(`Exam ${id} updated successfully`);
    res.json({ message: 'Exam updated successfully', exam });
  } catch (error) {
    console.error('Detailed error updating exam:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// اختبار API
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to New Generation International Schools API' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});