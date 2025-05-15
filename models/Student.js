const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true }, // حقل name مطلوب
  fullNameAr: { type: String }, // اختياري
  fullNameEn: { type: String }, // اختياري
  nationalId: { type: String }, // اختياري
  birthDate: { type: Date }, // اختياري
  passportNumber: { type: String }, // اختياري
  nationality: { type: String }, // اختياري
  previousSchool: { type: String }, // اختياري
  fatherNationalId: { type: String }, // اختياري
  fatherPhone: { type: String }, // اختياري
  motherPhone: { type: String }, // اختياري
  fatherJob: { type: String }, // اختياري
  fatherWorkplace: { type: String }, // اختياري
  division: { type: String, enum: ['American', 'British'], required: true },
  stage: { type: String, required: true },
  level: { type: String, required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
});

module.exports = mongoose.model('Student', studentSchema);