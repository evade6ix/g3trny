import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username/password required' });
  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: 'Username already taken' });
  const passwordHash = await bcrypt.hash(password, 10);
  const isFirst = (await User.countDocuments()) === 0;
  const user = await User.create({ username, passwordHash, isAdmin: isFirst });
  return res.json({ id: user._id, username: user.username, isAdmin: user.isAdmin });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user._id, username: user.username, isAdmin: user.isAdmin, history: user.history } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  return res.json({ id: user._id, username: user.username, isAdmin: user.isAdmin, history: user.history });
});

router.post('/make-admin', requireAuth, requireAdmin, async (req, res) => {
  const { username } = req.body;
  const user = await User.findOneAndUpdate({ username }, { isAdmin: true }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: user._id, username: user.username, isAdmin: user.isAdmin });
});

export default router;
