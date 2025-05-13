const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
      },
      options: {
        type: [String],
        required: true,
      },
      correctAnswer: {
        type: String,
        required: true,
      },
      image: {
        type: String, // سيتم تخزين رابط الصورة (مثل /uploads/filename.jpg)
        default: '',
      },
    },
  ],
  division: {
    type: String,
    required: true,
  },
  stage: {
    type: String,
    required: true,
  },
  level: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Exam', examSchema);