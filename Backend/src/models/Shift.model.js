import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brandId: {
      type: String,
      default: 'ALL',
      index: true,
    },
    startTime: {
      type: String, // HH:mm (24hr)
      required: true,
      default: '09:00',
    },
    endTime: {
      type: String, // HH:mm (24hr)
      required: true,
      default: '18:00',
    },
    isOvernight: {
      type: Boolean,
      default: false,
    },
    graceMinutes: {
      type: Number,
      default: 15,
    },
    halfDayMinutes: {
      type: Number,
      default: 240,
    },
    breakDurationMinutes: {
      type: Number,
      default: 60,
    },
    weeklyOffs: {
      type: [String],
      default: ['Sunday'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;
