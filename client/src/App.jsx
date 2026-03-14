import { Link, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import EventPage from './pages/EventPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AuthPanel from './components/AuthPanel.jsx';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('session') || 'null'));

  useEffect(() => {
    if (session) localStorage.setItem('session', JSON.stringify(session));
    else localStorage.removeItem('session');
  }, [session]);

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <h1>Store Tournament HQ</h1>
        <nav>
          <Link to="/">Events</Link>
          {session && <Link to="/profile">Profile</Link>}
        </nav>
        <AuthPanel session={session} setSession={setSession} />
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage session={session} />} />
          <Route path="/events/:id" element={<EventPage session={session} />} />
          <Route path="/profile" element={<ProfilePage session={session} />} />
        </Routes>
      </main>
    </div>
  );
}
