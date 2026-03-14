import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import eventsRouter from './routes/events.js';
import User from './models/User.js';
import Event from './models/Event.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[mongoose.connection.readyState] ?? 'unknown';
  res.json({ ok: state === 'connected', dbState: state });
});
app.use('/auth', authRoutes);
app.use('/events', eventsRouter(io));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tourney';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await Promise.all([User.createCollection(), Event.createCollection()]);
    server.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
      console.log('MongoDB collections ensured: users, events');
    });
  })
  .catch((err) => {
    console.error('Mongo connection failed', err);
    process.exit(1);
  });
