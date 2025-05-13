const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fullNameAr: { type: String, required: true },
  fullNameEn: { type: String, required: true },
  nationalId: { type: String, required: true },
  birthDate: { type: Date, required: true },
  passportNumber: { type: String, required: true },
  nationality: { type: String, required: true },
  previousSchool: { type: String },
  fatherNationalId: { type: String, required: true },
  fatherPhone: { type: String, required: true },
  motherPhone: { type: String, required: true },
  fatherJob: { type: String, required: true },
  fatherWorkplace: { type: String, required: true },
  division: { type: String, enum: ['American', 'British'], required: true },
  stage: { type: String, required: true },
  level: { type: String, required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
});

module.exports = mongoose.model('Student', studentSchema);