import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dateString: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    brandId: {
      type: String,
      default: 'ALL',
      index: true,
    },
    isOptional: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index({ brandId: 1, dateString: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
