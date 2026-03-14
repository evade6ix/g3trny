import { useState } from 'react';
import { API } from '../App.jsx';

export default function AuthPanel({ session, setSession }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function submit(mode) {
    const response = await fetch(`${API}/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) return alert(data.error || 'Auth failed');
    if (mode === 'login') setSession(data);
    else alert('Registered! Please login.');
  }

  if (session) {
    return (
      <div className="auth-wrap">
        <span>{session.user.username}{session.user.isAdmin ? ' (Admin)' : ''}</span>
        <button onClick={() => setSession(null)}>Logout</button>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={() => submit('login')}>Login</button>
      <button className="ghost" onClick={() => submit('register')}>Register</button>
    </div>
  );
}
