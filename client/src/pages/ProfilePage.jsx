import { useEffect, useState } from 'react';
import { API } from '../App.jsx';

export default function ProfilePage({ session }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${session.token}` } })
      .then((res) => res.json())
      .then(setProfile);
  }, [session]);

  if (!session) return <p>Please login.</p>;
  if (!profile) return <p>Loading profile...</p>;

  return (
    <section>
      <h2>{profile.username}</h2>
      <p>Role: {profile.isAdmin ? 'Admin' : 'Player'}</p>
      <div className="card">
        <h3>Tournament History</h3>
        <ul>
          {profile.history?.map((h, i) => (
            <li key={i}>{h.eventName} — #{h.placement} — {h.record} ({new Date(h.date).toLocaleDateString()})</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
