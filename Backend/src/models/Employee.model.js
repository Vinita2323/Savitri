import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      default: 'Associate',
    },
    department: {
      type: String,
      required: true,
      trim: true,
      default: 'Operations',
    },
    brandId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'brand_fg',
    },
    brandName: {
      type: String,
      default: 'Fashion Gallary',
    },
    storeId: {
      type: String,
      default: '',
    },
    storeName: {
      type: String,
      default: 'Central Hub',
    },
    reportingManager: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
      name: { type: String, default: '' },
      designation: { type: String, default: '' },
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
      default: 'Full-time',
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
      default: 'Active',
      index: true,
    },
    shift: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
      name: { type: String, default: 'Standard General Shift (9 AM - 6 PM)' },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    notes: {
      type: String,
      default: '',
    },

    // ── Employee portal (self-registration, login, approval) ──
    password: { type: String, select: false, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    dateOfBirth: { type: Date, default: null },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    // Records created before the portal existed carry no value and are treated as Approved.
    registrationStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved', index: true },
    rejectionReason: { type: String, default: '' },
    reviewedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' },
      at: { type: Date, default: null },
    },
    assignedAdmin: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
      name: { type: String, default: '' },
    },
    // Identity document uploaded at registration (Aadhaar, PAN, ...)
    idProof: {
      type: { type: String, default: '' },
      documentUrl: { type: String, default: '' },
    },
    // Optional extra documents uploaded at registration (address proof, certificates, experience letters, ...)
    additionalDocuments: [
      {
        label: { type: String, default: 'Other', trim: true },
        name: { type: String, default: '', trim: true },
        url: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Web push (FCM) device tokens, used for reminders when the app is in the background
    fcmTokens: { type: [String], default: [], select: false },
    registrationSource: { type: String, enum: ['self', 'admin'], default: 'admin' },
    // "Forgot password": the one-time code sent by SMS, stored only as a hash. Never returned by any API.
    passwordReset: {
      type: new mongoose.Schema({
        codeHash: { type: String, default: '' },
        expiresAt: { type: Date, default: null },
        attempts: { type: Number, default: 0 }, // wrong codes entered for this code
        sentAt: { type: Date, default: null },
        sends: { type: Number, default: 0 }, // codes sent in the current hour
        windowStart: { type: Date, default: null },
      }, { _id: false }),
      select: false,
      default: undefined,
    },
    // Bumped on password reset / deactivation so older tokens stop working immediately.
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ brandId: 1, employmentStatus: 1 });
employeeSchema.index({ department: 1, designation: 1 });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
