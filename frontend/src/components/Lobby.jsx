import React, { useEffect, useState } from 'react';
import { Trophy, Users, User, Gamepad2, XCircle } from 'lucide-react';

export default function Lobby({ user, socket }) {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [incomingChallenge, setIncomingChallenge] = useState(null);
    const [selectedGame, setSelectedGame] = useState(null); // 'dominoes' or 'tictactoe'

    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/leaderboard`)
            .then(res => res.json())
            .then(data => setLeaderboard(data));

        socket.on('online_users', (users) => {
            setOnlineUsers(users.filter(id => id !== user.id));
        });

        socket.on('challenge_received', ({ from, gameType }) => {
            setIncomingChallenge({ from, gameType });
        });

        return () => {
            socket.off('online_users');
            socket.off('challenge_received');
        };
    }, [socket, user.id]);

    const challengeUser = (opponentId) => {
        if (!selectedGame) return alert("Selecciona un juego primero");
        socket.emit('challenge', { opponentId, gameType: selectedGame });
        alert(`¡Desafiaste a ${opponentId} a ${selectedGame === 'dominoes' ? 'Dominó' : 'Tres en Raya'}! Esperando respuesta...`);
        setSelectedGame(null); // reset
    };

    const acceptChallenge = () => {
        if (incomingChallenge) {
            socket.emit('accept_challenge', { challengerId: incomingChallenge.from, gameType: incomingChallenge.gameType });
            setIncomingChallenge(null);
        }
    };

    return (
        <div className="container">
            {/* Header / Profile */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {user.avatarUrl ? <img src={user.avatarUrl} alt="avatar" style={{width: '100%', height: '100%'}}/> : <User size={30} color="white" />}
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{user.username}</h2>
                        <span style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '1.1rem' }}>🪙 {user.points} pts</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', color: '#aaa', fontSize: '1rem' }}>
                    <div>Victorias: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{user.wins}</span></div>
                    <div>Derrotas: <span style={{ color: '#f87171', fontWeight: 'bold' }}>{user.losses}</span></div>
                </div>
            </div>

            {incomingChallenge && (
                <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 2s infinite' }}>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1.5rem' }}>⚔️ ¡Nuevo Desafío!</h3>
                        <p style={{ margin: 0, color: '#ccc', fontSize: '1.1rem' }}>El jugador <strong>{incomingChallenge.from}</strong> te ha desafiado a jugar a <strong>{incomingChallenge.gameType === 'dominoes' ? 'Dominó' : 'Tres en Raya'}</strong>.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="glass-button" onClick={acceptChallenge} style={{ fontSize: '1.1rem', padding: '12px 24px' }}>Aceptar</button>
                        <button className="glass-button-secondary" onClick={() => setIncomingChallenge(null)}>Rechazar</button>
                    </div>
                </div>
            )}

            {/* Game Selection */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Gamepad2 size={24} color="#a855f7" /> Selecciona un Juego
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Dominoes Card */}
                <div 
                    onClick={() => setSelectedGame(selectedGame === 'dominoes' ? null : 'dominoes')}
                    className="glass-panel" 
                    style={{ 
                        padding: '2rem', 
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: selectedGame === 'dominoes' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                        transform: selectedGame === 'dominoes' ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s ease',
                        background: selectedGame === 'dominoes' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.05)'
                    }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🁣</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>Dominó (¡Hasta 4 Jugadores!)</h3>
                    <p style={{ color: '#aaa', margin: 0 }}>El clásico juego de mesa dominicano. Apila fichas y bloquea a tu oponente.</p>
                </div>

                {/* TicTacToe Card */}
                <div 
                    onClick={() => setSelectedGame(selectedGame === 'tictactoe' ? null : 'tictactoe')}
                    className="glass-panel" 
                    style={{ 
                        padding: '2rem', 
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: selectedGame === 'tictactoe' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        transform: selectedGame === 'tictactoe' ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s ease',
                        background: selectedGame === 'tictactoe' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)'
                    }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⭕❌</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem' }}>Tres en Raya</h3>
                    <p style={{ color: '#aaa', margin: 0 }}>Rápido y táctico. Sé el primero en hacer línea con 3 símbolos.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Online Players */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                        <Users size={20} color="#6366f1" /> Jugadores Disponibles
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {!selectedGame && <div style={{ color: '#a855f7', fontStyle: 'italic', marginBottom: '1rem' }}>↑ Selecciona un juego primero para ver a quién puedes retar.</div>}
                        
                        {onlineUsers.length === 0 ? <p style={{ color: '#aaa' }}>No hay otros jugadores en línea.</p> : null}
                        {onlineUsers.map(id => (
                            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>Player_{id.substring(0,4)}</span>
                                <button 
                                    className="glass-button" 
                                    disabled={!selectedGame}
                                    style={{ opacity: selectedGame ? 1 : 0.5, cursor: selectedGame ? 'pointer' : 'not-allowed' }}
                                    onClick={() => challengeUser(id)}
                                >
                                    ¡Desafiar!
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                        <Trophy size={20} color="#eab308" /> Ranking Global
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {leaderboard.map((lbUser, idx) => (
                            <div key={lbUser.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 1rem', background: idx === 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '8px', border: idx === 0 ? '1px solid rgba(234, 179, 8, 0.3)' : 'none' }}>
                                <div>
                                    <span style={{ color: idx === 0 ? '#eab308' : '#aaa', marginRight: '1rem', fontWeight: 'bold' }}>#{idx + 1}</span>
                                    <strong>{lbUser.username}</strong>
                                </div>
                                <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{lbUser.points} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
