import mongoose from 'mongoose';

/** Heartbeat of a background job. If the server was down, the next run sees the gap and treats the outage fairly. */
const schedulerStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    lastRunAt: { type: Date, default: null },
    lastPurgeDate: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.SchedulerState || mongoose.model('SchedulerState', schedulerStateSchema);
