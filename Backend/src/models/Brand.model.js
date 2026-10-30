import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
  {
    brandId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Madhya Pradesh',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    contact: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    gst: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'Apparel & Fashion',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    locality: {
      type: String,
      trim: true,
      default: '',
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    coordinates: {
      latitude: { type: Number, default: 22.7196 },
      longitude: { type: Number, default: 75.8577 },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [75.8577, 22.7196],
      },
    },
    operatingRadiusKm: {
      type: Number,
      default: 25,
      min: 1,
      max: 200,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    supportPhone: {
      type: String,
      trim: true,
      default: '',
    },
    registeredOfficeAddress: {
      type: String,
      trim: true,
      default: '',
    },
    legalEntityName: {
      type: String,
      trim: true,
      default: '',
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
      default: '',
    },
    complianceStatus: {
      type: String,
      enum: ['Verified', 'Pending', 'Rejected'],
      default: 'Verified',
      index: true,
    },
    allowSellerRegistration: {
      type: Boolean,
      default: true,
    },
    sellerApprovalMode: {
      type: String,
      enum: ['Manual Review', 'Automatic'],
      default: 'Manual Review',
    },
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
      days: { type: String, default: 'Mon - Sun' },
    },
    operationalNotes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Draft'],
      default: 'Active',
      index: true,
    },
    logo: {
      type: String,
      default: '/LogoSavitri.png',
    },
    description: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.index({ location: '2dsphere' });
brandSchema.index({ city: 1, status: 1 });

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
