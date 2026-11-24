import mongoose from 'mongoose';

/**
 * One row per verification slot of an employee's working day.
 *   sequence 0            -> the LOGIN selfie (verificationType LOGIN)
 *   sequence 1, 2, 3 ...  -> the periodic ("every 2 hours") verifications
 * A slot is created PENDING when it is scheduled and moves, exactly once, to COMPLETED, MISSED or CANCELLED.
 * The unique index (employee, workDate, sequence) is what makes duplicate slots / duplicate reminders impossible.
 * Images are NOT stored here: only a private storage key. Access is through short-lived signed links.
 */
const employeeSelfieSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true, index: true }, // "employeeId" in the specification (EMP-2026-0001)
    employeeName: { type: String, required: true },
    brandId: { type: String, default: '', index: true },
    department: { type: String, default: '' },
    designation: { type: String, default: '' },

    workDate: { type: String, required: true }, // YYYY-MM-DD, Asia/Kolkata
    verificationType: { type: String, enum: ['LOGIN', 'PERIODIC'], required: true },
    sequence: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ['PENDING', 'COMPLETED', 'MISSED', 'CANCELLED'], default: 'PENDING', index: true },
    scheduledAt: { type: Date, required: true }, // when this verification is due
    graceUntil: { type: Date, required: true }, // after this it is marked MISSED
    graceExtendedForOutage: { type: Boolean, default: false },

    // Completion. serverTimestamp is authoritative; clientCapturedAt is only what the device claimed (audit).
    capturedAt: { type: Date, default: null },
    serverTimestamp: { type: Date, default: null },
    clientCapturedAt: { type: Date, default: null },
    clockSkewSeconds: { type: Number, default: null },
    late: { type: Boolean, default: false }, // completed after the due time
    minutesLate: { type: Number, default: 0 },

    imageKey: { type: String, default: '' },
    imageMime: { type: String, default: '' },
    imageSize: { type: Number, default: 0 },
    imageHash: { type: String, default: '' },
    imageDeletedAt: { type: Date, default: null }, // retention: the file is purged, the record stays
    deviceInfo: {
      userAgent: { type: String, default: '' },
      platform: { type: String, default: '' },
      language: { type: String, default: '' },
      screen: { type: String, default: '' },
      cameraLabel: { type: String, default: '' },
      captureMethod: { type: String, default: '' }, // always the live camera flow in the app
      ip: { type: String, default: '' },
    },

    // Lifecycle bookkeeping; each is set atomically exactly once (this is what prevents duplicate notifications)
    dueNotifiedAt: { type: Date, default: null },
    overdueNotifiedAt: { type: Date, default: null },
    missedAt: { type: Date, default: null },
    missedNotifiedAt: { type: Date, default: null },
    submittedNotifiedAt: { type: Date, default: null },
    history: [{ at: { type: Date, default: Date.now }, action: { type: String }, note: { type: String, default: '' }, _id: false }],
  },
  { timestamps: true }
);

employeeSelfieSchema.index({ employee: 1, workDate: 1, sequence: 1 }, { unique: true });
employeeSelfieSchema.index({ status: 1, graceUntil: 1 });
employeeSelfieSchema.index({ status: 1, scheduledAt: 1 });
employeeSelfieSchema.index({ brandId: 1, workDate: 1 });

export default mongoose.models.EmployeeSelfie || mongoose.model('EmployeeSelfie', employeeSelfieSchema);
