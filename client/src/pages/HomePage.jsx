import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API } from '../App.jsx';

const socket = io(API, { autoConnect: true });

export default function HomePage({ session }) {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ name: '', description: '', entryPrice: '', startDate: '' });

  async function load() {
    const res = await fetch(`${API}/events`);
    setEvents(await res.json());
  }

  useEffect(() => {
    load();
    socket.on('events:updated', load);
    return () => socket.off('events:updated', load);
  }, []);

  async function createEvent() {
    const res = await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ ...newEvent, entryPrice: Number(newEvent.entryPrice) })
    });
    if (!res.ok) return alert('Failed to create event');
    setNewEvent({ name: '', description: '', entryPrice: '', startDate: '' });
  }

  return (
    <section>
      <h2>Upcoming & Active Tournaments</h2>
      {session?.user?.isAdmin && (
        <div className="card">
          <h3>Create Event</h3>
          <input placeholder="Name" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
          <input placeholder="Description" value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
          <input type="datetime-local" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} />
          <input placeholder="Entry price" value={newEvent.entryPrice} onChange={(e) => setNewEvent({ ...newEvent, entryPrice: e.target.value })} />
          <button onClick={createEvent}>Create</button>
        </div>
      )}
      <div className="grid">
        {events.map((event) => (
          <Link key={event._id} to={`/events/${event._id}`} className="card event-card">
            <h3>{event.name}</h3>
            <p>{event.description}</p>
            <p>{new Date(event.startDate).toLocaleString()}</p>
            <p>${event.entryPrice ?? 0}</p>
            <p className="badge">{event.status}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
