import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TicTacToeGame({ user, socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState(null);
    const [gameOverMsg, setGameOverMsg] = useState('');

    useEffect(() => {
        socket.emit('join_room', roomId);

        socket.on('game_state', (state) => {
            setGameState(state);
        });

        socket.on('game_over', ({ winner }) => {
            if (winner === 'draw') setGameOverMsg('¡Empate! 🤝 Sin cambios en los puntos.');
            else if (winner === user.id) setGameOverMsg('¡Ganaste! 🎉 +50 Pts');
            else setGameOverMsg('¡Perdiste! 😞 -15 Pts');
        });

        return () => {
            socket.off('game_state');
            socket.off('game_over');
        };
    }, [roomId, socket, user.id]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Cargando partida...</div>;

    const isMyTurn = gameState.turn === user.id;

    const playMove = (index) => {
        if (!isMyTurn || gameState.board[index] !== null) return;
        socket.emit('play_ttt_move', { roomId, index });
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={20} /> Salir
                    </button>
                    <div style={{ fontWeight: 'bold', color: isMyTurn ? '#4ade80' : '#f87171', fontSize: '1.2rem' }}>
                        {isMyTurn ? "¡Tu Turno!" : "Turno del oponente"}
                    </div>
                    <div>Juegas con: <strong style={{color: gameState.mySymbol === 'X' ? '#a855f7' : '#6366f1', fontSize: '1.5rem'}}>{gameState.mySymbol}</strong></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                    {gameState.board.map((cell, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => playMove(idx)}
                            style={{ 
                                width: '100px', 
                                height: '100px', 
                                background: cell === null && isMyTurn ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                fontSize: '3rem', 
                                fontWeight: 'bold',
                                color: cell === 'X' ? '#a855f7' : '#6366f1',
                                borderRadius: '8px',
                                cursor: cell === null && isMyTurn ? 'pointer' : 'default',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (cell === null && isMyTurn) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            }}
                            onMouseOut={(e) => {
                                if (cell === null && isMyTurn) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            {cell}
                        </div>
                    ))}
                </div>
            </div>

            {/* Game Over Modal */}
            {gameOverMsg && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', background: '-webkit-linear-gradient(#fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {gameOverMsg}
                        </h1>
                        <button className="glass-button" onClick={() => navigate('/')} style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
                            Volver al Lobby
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
