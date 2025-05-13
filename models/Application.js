const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    default: 'pending'
  },
  division: {
    type: String,
    required: true
  },
  stage: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true
  },
  exams: [
    {
      subject: String,
      score: Number,
      comments: String,
      results: [
        {
          question: String,
          image: String, // إضافة حقل image
          studentAnswer: String,
          correctAnswer: String,
          isCorrect: Boolean
        }
      ],
      seenByDepartmentHead: {
        type: Boolean,
        default: false
      }
    }
  ]
});

module.exports = mongoose.model('Application', ApplicationSchema);