import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    displayName: { type: String, required: true },
    isGuest: { type: Boolean, default: false },
    dropped: { type: Boolean, default: false }
  },
  { _id: true }
);

const matchSchema = new mongoose.Schema(
  {
    table: Number,
    playerA: { type: mongoose.Schema.Types.ObjectId },
    playerB: { type: mongoose.Schema.Types.ObjectId },
    result: {
      winner: { type: mongoose.Schema.Types.ObjectId },
      isDraw: { type: Boolean, default: false },
      reported: { type: Boolean, default: false }
    }
  },
  { _id: true }
);

const roundSchema = new mongoose.Schema(
  {
    roundNumber: Number,
    pairingsConfirmed: { type: Boolean, default: false },
    startedAt: Date,
    endedAt: Date,
    matches: [matchSchema]
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    location: String,
    startDate: Date,
    entryPrice: Number,
    status: {
      type: String,
      enum: ['upcoming', 'registration-closed', 'running', 'top-cut', 'completed'],
      default: 'upcoming'
    },
    participants: [participantSchema],
    rounds: [roundSchema],
    topCutSize: { type: Number, default: 8 },
    topCutMatches: [roundSchema],
    standingsSnapshot: [
      {
        participantId: mongoose.Schema.Types.ObjectId,
        displayName: String,
        points: Number,
        wins: Number,
        losses: Number,
        draws: Number,
        buchholz: Number,
        opponentWinPct: Number
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);
