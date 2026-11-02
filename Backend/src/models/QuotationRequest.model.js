import mongoose from 'mongoose';

export const REQUEST_STATUSES = ['Pending', 'Under Review', 'Quotation Created', 'Rejected'];

const quotationRequestSchema = new mongoose.Schema(
  {
    brandId: { type: String, required: true, index: true, trim: true },
    requestNumber: { type: String, required: true, unique: true, trim: true },

    organizationName: { type: String, required: true, trim: true },
    organizationType: { type: String, default: 'Government', trim: true },
    department: { type: String, default: '', trim: true },
    contactPerson: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    gstin: { type: String, default: '', trim: true },

    deliveryLocation: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },

    requiredDeliveryDate: { type: String, default: '' },
    requestDate: { type: String, default: '' },
    estimatedBudget: { type: String, default: '' },
    totalEstimatedUnits: { type: Number, default: 0 },
    requestedProducts: { type: [mongoose.Schema.Types.Mixed], default: [] },
    notes: { type: String, default: '' },

    status: { type: String, enum: REQUEST_STATUSES, default: 'Pending', index: true },
    quotationNumber: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

quotationRequestSchema.index({ brandId: 1, createdAt: -1 });

const QuotationRequest = mongoose.model('QuotationRequest', quotationRequestSchema);
export default QuotationRequest;
