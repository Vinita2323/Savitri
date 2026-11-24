import mongoose from 'mongoose';

/** Attendance rules. scope 'GLOBAL' applies everywhere; a brandId overrides it for that brand. */
const employeeSettingsSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, unique: true, trim: true },
    officeStartTime: { type: String, default: '09:30' }, // HH:mm, Asia/Kolkata
    officeEndTime: { type: String, default: '18:30' },
    graceMinutes: { type: Number, default: 15, min: 0, max: 240 },
    // worked minutes below this when the day is closed -> Half Day
    halfDayMinutes: { type: Number, default: 240, min: 0, max: 1440 },
    weeklyOffs: { type: [String], default: ['Sunday'] },
    timezone: { type: String, default: 'Asia/Kolkata' },
    // Live selfie verification
    selfieEnabled: { type: Boolean, default: true },
    selfieIntervalMinutes: { type: Number, default: 120, min: 30, max: 480 },
    selfieGraceMinutes: { type: Number, default: 15, min: 1, max: 120 },
    updatedBy: { name: { type: String, default: '' }, role: { type: String, default: '' } },
  },
  { timestamps: true }
);

const EmployeeSettings = mongoose.model('EmployeeSettings', employeeSettingsSchema);
export default EmployeeSettings;
