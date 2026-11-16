import mongoose from 'mongoose';

/** One row per time an employee submits a task for review, with the reviewer's decision. */
const employeeTaskSubmissionSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeTask', required: true, index: true },
    taskCode: { type: String, default: '' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeName: { type: String, default: '' },
    brandId: { type: String, default: '', index: true },
    notes: { type: String, default: '' },
    attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Approved', 'Changes Requested', 'Rejected'], default: 'Pending', index: true },
    reviewNotes: { type: String, default: '' },
    reviewedBy: { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: String, role: String },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const EmployeeTaskSubmission = mongoose.model('EmployeeTaskSubmission', employeeTaskSubmissionSchema);
export default EmployeeTaskSubmission;
