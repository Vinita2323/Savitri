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
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ brandId: 1, employmentStatus: 1 });
employeeSchema.index({ department: 1, designation: 1 });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
