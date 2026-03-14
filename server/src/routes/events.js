import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { computeStandings, generateSwissPairings } from '../utils/tournament.js';

export default function eventsRouter(io) {
  const router = express.Router();

  const publish = async (eventId) => {
    const fresh = await Event.findById(eventId).lean();
    io.emit(`event:${eventId}:updated`, fresh);
    io.emit('events:updated');
  };

  router.get('/', async (_req, res) => {
    const events = await Event.find().sort({ startDate: 1 }).lean();
    res.json(events);
  });

  router.get('/:id', async (req, res) => {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  });

  router.post('/', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.create(req.body);
    await publish(event._id);
    res.status(201).json(event);
  });

  router.post('/:id/register', requireAuth, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    if (event.participants.some((p) => String(p.userId) === req.user.id)) return res.status(409).json({ error: 'Already registered' });
    event.participants.push({ userId: req.user.id, displayName: req.user.username, isGuest: false });
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/admin-add', requireAuth, requireAdmin, async (req, res) => {
    const { username, guestName } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });

    if (username) {
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!event.participants.some((p) => String(p.userId) === String(user._id))) {
        event.participants.push({ userId: user._id, displayName: user.username, isGuest: false });
      }
    }

    if (guestName) {
      event.participants.push({ displayName: guestName, isGuest: true });
    }

    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/start', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    event.status = 'running';
    const matches = generateSwissPairings(event);
    event.rounds.push({ roundNumber: event.rounds.length + 1, matches, pairingsConfirmed: false });
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/rounds/:roundId/confirm', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    const round = event?.rounds.id(req.params.roundId);
    if (!round) return res.status(404).json({ error: 'Round not found' });
    round.pairingsConfirmed = true;
    round.startedAt = new Date();
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/report', requireAuth, requireAdmin, async (req, res) => {
    const { roundId, matchId, winnerParticipantId, isDraw } = req.body;
    const event = await Event.findById(req.params.id);
    const round = event?.rounds.id(roundId);
    const match = round?.matches.id(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    match.result.reported = true;
    match.result.isDraw = Boolean(isDraw);
    match.result.winner = isDraw ? null : winnerParticipantId;
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/next-round', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    const lastRound = event.rounds[event.rounds.length - 1];
    if (lastRound) lastRound.endedAt = new Date();
    const matches = generateSwissPairings(event);
    event.rounds.push({ roundNumber: event.rounds.length + 1, matches, pairingsConfirmed: false });
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/end-swiss', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    const standings = computeStandings(event);
    event.status = 'top-cut';
    event.standingsSnapshot = standings;
    const seeds = standings.slice(0, event.topCutSize);
    const matches = [];
    for (let i = 0; i < seeds.length / 2; i++) {
      matches.push({
        table: i + 1,
        playerA: seeds[i].participantId,
        playerB: seeds[seeds.length - 1 - i].participantId,
        result: { reported: false, isDraw: false }
      });
    }
    event.topCutMatches = [{ roundNumber: 1, pairingsConfirmed: true, startedAt: new Date(), matches }];
    await event.save();
    await publish(event._id);
    res.json(event);
  });

  router.post('/:id/complete', requireAuth, requireAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    const standings = computeStandings(event);
    event.status = 'completed';
    event.standingsSnapshot = standings;
    await event.save();

    await Promise.all(
      standings.map((s, i) =>
        Event.updateOne(
          { _id: event._id, 'participants._id': s.participantId, 'participants.userId': { $exists: true } },
          {}
        ).then(async () => {
          const participant = event.participants.id(s.participantId);
          if (!participant?.userId) return;
          await User.updateOne(
            { _id: participant.userId },
            {
              $push: {
                history: {
                  eventId: event._id,
                  eventName: event.name,
                  placement: i + 1,
                  record: `${s.wins}-${s.losses}-${s.draws}`,
                  date: new Date()
                }
              }
            }
          );
        })
      )
    );

    await publish(event._id);
    res.json(event);
  });

  router.get('/:id/standings', async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Not found' });
    const standings = computeStandings(event);
    res.json(standings);
  });

  return router;
}
