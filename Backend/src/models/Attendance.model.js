import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    brandId: {
      type: String,
      required: true,
      index: true,
    },
    storeId: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dateString: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    shift: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
      name: { type: String, default: 'Standard Shift' },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      graceMinutes: { type: Number, default: 15 },
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkInSource: {
      type: String,
      enum: ['Web', 'Mobile', 'Kiosk', 'Admin'],
      default: 'Web',
    },
    checkInLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: '' },
      device: { type: String, default: '' },
    },
    checkOut: {
      type: Date,
      default: null,
    },
    checkOutSource: {
      type: String,
      enum: ['Web', 'Mobile', 'Kiosk', 'Admin', ''],
      default: '',
    },
    checkOutLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: '' },
      device: { type: String, default: '' },
    },
    totalDurationMinutes: {
      type: Number,
      default: 0,
    },
    breakDurationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'Present',
        'Absent',
        'Late',
        'Half Day',
        'On Leave',
        'Holiday',
        'Weekly Off',
        'Incomplete',
      ],
      default: 'Present',
      index: true,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    isMissingCheckout: {
      type: Boolean,
      default: false,
    },
    correction: {
      isCorrected: { type: Boolean, default: false },
      originalCheckIn: { type: Date, default: null },
      originalCheckOut: { type: Date, default: null },
      originalStatus: { type: String, default: '' },
      reason: { type: String, default: '' },
      requestedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, default: null },
        name: { type: String, default: '' },
        role: { type: String, default: '' },
      },
      approvedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, default: null },
        name: { type: String, default: '' },
        role: { type: String, default: '' },
      },
      correctedAt: { type: Date, default: null },
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance records for the same employee on the same date
attendanceSchema.index({ employee: 1, dateString: 1 }, { unique: true });
attendanceSchema.index({ brandId: 1, dateString: 1, status: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
