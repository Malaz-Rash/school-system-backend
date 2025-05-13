const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'DepartmentHead', 'Registrar', 'Parent'], required: true },
  department: { type: String, enum: ['Math', 'English', 'Science', 'Arabic'] }, // للرؤساء
  division: { type: String, enum: ['American', 'British'] }, // للرؤساء
});

module.exports = mongoose.model('User', userSchema);