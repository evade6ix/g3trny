import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    eventName: String,
    placement: Number,
    record: String,
    date: Date
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    history: [historySchema]
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
