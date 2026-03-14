# Store Tournament HQ

Modern full-stack tournament software for a local store, with Swiss rounds, Buchholz tie-breakers, live sync updates, and user profiles.

## Stack
- **Server (Railway):** Node.js + Express + MongoDB + Socket.IO
- **Client (Vercel):** React + Vite + Socket.IO client

## Features
- Account registration/login
- Admin role + promote user to admin
- Event creation with pricing/date/details
- User self-registration for events
- Admin registration by username or guest entry
- Swiss round generation with pairing confirmation workflow
- Match reporting, live standings (points + Buchholz + Opp Win%)
- End Swiss and create seeded Top Cut bracket
- Round-by-round visibility and real-time spectator updates
- Player profile history of completed results

## Setup
```bash
npm install
cp server/.env.example server/.env
npm run dev -w server
npm run dev -w client
```

Client defaults to `http://localhost:4000`; override with `VITE_API_URL`.

## MongoDB collections note
On server startup, the app now proactively creates/ensures the `users` and `events` collections so they appear in MongoDB right away (instead of waiting for the first insert).

## Deploy
- Deploy `server` to Railway with env vars from `.env.example`
- Deploy `client` to Vercel with `VITE_API_URL` set to Railway server URL
