import mongoose from 'mongoose';

/**
 * Atomic sequence counters (e.g. quotation numbers). `$inc` on a single document is atomic, so
 * concurrent requests can never receive the same value - this does not depend on any unique index.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export const nextSequence = async (key) => {
  const c = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return c.seq;
};

export default Counter;
