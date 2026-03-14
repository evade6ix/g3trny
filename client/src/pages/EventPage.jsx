import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API } from '../App.jsx';

const socket = io(API, { autoConnect: true });

export default function EventPage({ session }) {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [standings, setStandings] = useState([]);
  const [addUser, setAddUser] = useState('');
  const [guestName, setGuestName] = useState('');

  const isAdmin = !!session?.user?.isAdmin;

  async function load() {
    const [eventRes, standingsRes] = await Promise.all([fetch(`${API}/events/${id}`), fetch(`${API}/events/${id}/standings`)]);
    if (!eventRes.ok) return;
    setEvent(await eventRes.json());
    if (standingsRes.ok) setStandings(await standingsRes.json());
  }

  useEffect(() => {
    load();
    const evt = `event:${id}:updated`;
    const onUpdate = (payload) => setEvent(payload);
    socket.on(evt, onUpdate);
    socket.on(evt, load);
    return () => {
      socket.off(evt, onUpdate);
      socket.off(evt, load);
    };
  }, [id]);

  const tokenHeader = useMemo(() => ({ Authorization: `Bearer ${session?.token}`, 'Content-Type': 'application/json' }), [session]);

  async function call(path, body = {}) {
    const res = await fetch(`${API}/events/${id}${path}`, { method: 'POST', headers: tokenHeader, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Request failed');
    }
  }

  if (!event) return <p>Loading...</p>;

  return (
    <section>
      <h2>{event.name}</h2>
      <p>{event.description}</p>
      <p><strong>Entry:</strong> ${event.entryPrice ?? 0}</p>
      <p><strong>Status:</strong> {event.status}</p>
      {session && <button onClick={() => call('/register')}>Register for Event</button>}

      {isAdmin && (
        <div className="card">
          <h3>Admin Controls</h3>
          <div className="split">
            <input placeholder="username" value={addUser} onChange={(e) => setAddUser(e.target.value)} />
            <button onClick={() => call('/admin-add', { username: addUser })}>Add User</button>
          </div>
          <div className="split">
            <input placeholder="guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            <button onClick={() => call('/admin-add', { guestName })}>Add Guest</button>
          </div>
          <div className="split">
            <button onClick={() => call('/start')}>Start Event</button>
            <button onClick={() => call('/next-round')}>Next Swiss Round</button>
            <button onClick={() => call('/end-swiss')}>End Swiss / Top Cut</button>
            <button onClick={() => call('/complete')}>Complete Event</button>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Registered Players ({event.participants.length})</h3>
          <ul>
            {event.participants.map((p) => (
              <li key={p._id}>{p.displayName}{p.isGuest ? ' (Guest)' : ''}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Standings</h3>
          <table>
            <thead><tr><th>#</th><th>Player</th><th>Pts</th><th>W-L-D</th><th>Buchholz</th><th>Opp Win%</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={String(s.participantId)}><td>{i + 1}</td><td>{s.displayName}</td><td>{s.points}</td><td>{s.wins}-{s.losses}-{s.draws}</td><td>{s.buchholz}</td><td>{(s.opponentWinPct * 100).toFixed(1)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Swiss Rounds</h3>
        {event.rounds.map((round) => (
          <div key={round._id} className="round-block">
            <h4>Round {round.roundNumber} {round.pairingsConfirmed ? '' : '(Pending Confirmation)'}</h4>
            {isAdmin && !round.pairingsConfirmed && <button onClick={() => call(`/rounds/${round._id}/confirm`)}>Confirm Pairings</button>}
            {round.matches.map((m) => (
              <div key={m._id} className="match-row">
                <span>Table {m.table}</span>
                <span>{event.participants.find((p) => p._id === m.playerA)?.displayName} vs {event.participants.find((p) => p._id === m.playerB)?.displayName}</span>
                <span>{m.result?.reported ? (m.result?.isDraw ? 'Draw' : `Winner: ${event.participants.find((p) => p._id === m.result.winner)?.displayName || 'N/A'}`) : 'Pending'}</span>
                {isAdmin && !m.result?.reported && (
                  <div className="split">
                    <button onClick={() => call('/report', { roundId: round._id, matchId: m._id, winnerParticipantId: m.playerA })}>A wins</button>
                    <button onClick={() => call('/report', { roundId: round._id, matchId: m._id, winnerParticipantId: m.playerB })}>B wins</button>
                    <button onClick={() => call('/report', { roundId: round._id, matchId: m._id, isDraw: true })}>Draw</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
