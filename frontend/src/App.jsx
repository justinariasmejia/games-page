import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import DominoesGame from './components/DominoesGame';
import TicTacToeGame from './components/TicTacToeGame';

// Configure Socket globally but connect via component
const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', { 
    autoConnect: false,
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
});

function AppContent() {
  const [user, setUser] = useState(null);
  const [discordId, setDiscordId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL for token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Store token securely or just use it to fetch profile
      localStorage.setItem('auth_token', token);
      window.history.replaceState({}, document.title, "/"); // remove from URL
      fetchProfile(token);
    } else {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) fetchProfile(savedToken);
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/me?token=${token}`, {
        headers: {
            "ngrok-skip-browser-warning": "true"
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('login', user.id);

      socket.on('start_game', ({ roomId, gameType }) => {
        navigate(`/play/${gameType || 'dominoes'}/${roomId}`);
      });

      return () => {
        socket.off('start_game');
      };
    }
  }, [user, navigate]);

  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/auth/discord`;
  };

  if (!user) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '450px', width: '100%' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '2.5rem', background: '-webkit-linear-gradient(#fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Plataforma Arcade
          </h2>
          <p style={{ color: '#aaa', marginBottom: '2rem', fontSize: '1.2rem' }}>Inicia sesión con tu cuenta de Discord para jugar y competir en el ranking global.</p>
          <button onClick={handleLogin} className="glass-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '15px', fontSize: '1.2rem', gap: '10px', background: '#5865F2' }}>
            {/* Simple Discord Icon SVG */}
            <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M107.7 8.07C99.71 3.92 90.96 1.05 81.82 0C80.7 2.05 79.44 4.54 78.53 6.64C68.61 5.16 58.74 5.16 49.03 6.64C48.11 4.54 46.81 2.05 45.69 0C36.48 1.05 27.76 3.92 19.83 8.07C3.39 32.55 -1.71 56.41 .55 80.12C11.33 88.08 21.72 92.83 31.84 96.36C34.33 92.97 36.54 89.36 38.4 85.52C34.73 84.14 31.25 82.47 27.97 80.5C28.84 79.86 29.69 79.18 30.5 78.47C50.51 87.72 77.29 87.72 97.02 78.47C97.83 79.18 98.68 79.86 99.55 80.5C96.26 82.47 92.77 84.14 89.1 85.52C90.96 89.36 93.16 92.97 95.65 96.36C105.77 92.83 116.16 88.08 126.94 80.12C129.67 52.88 122.18 29.35 107.7 8.07ZM42.45 65.69C36.18 65.69 31.02 60 31.02 53C31.02 46.01 35.98 40.31 42.45 40.31C48.92 40.31 54.08 46.01 53.88 53C53.88 60 48.92 65.69 42.45 65.69ZM85.08 65.69C78.81 65.69 73.65 60 73.65 53C73.65 46.01 78.61 40.31 85.08 40.31C91.55 40.31 96.71 46.01 96.51 53C96.51 60 91.55 65.69 85.08 65.69Z"/>
            </svg>
            Conectar con Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<div className="app-container"><Lobby user={user} setUser={setUser} socket={socket} /></div>} />
      <Route path="/play/dominoes/:roomId" element={<DominoesGame user={user} socket={socket} />} />
      <Route path="/play/tictactoe/:roomId" element={<TicTacToeGame user={user} socket={socket} />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
