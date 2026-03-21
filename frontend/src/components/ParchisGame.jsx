import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// Math helpers for geometric board
function getPolarCoordinates(globalPos) {
    // 0-67 path
    const angleDeg = (globalPos / 68) * 360; // 0 to 360
    const rad = (angleDeg - 90) * (Math.PI / 180); // -90 so 0 is at Top
    const radius = 180; // track radius
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

function getGoalCoordinates(localPos, colorAngleOffset) {
    // localPos 68 to 72 -> moving from path to center (0,0)
    const progress = (localPos - 67) / 5; // 0.2 to 1.0 (center)
    const radius = 180 * (1 - progress); 
    const rad = (colorAngleOffset - 90) * (Math.PI / 180);
    return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

export default function ParchisGame({ user, socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState(null);
    const [gameOverMsg, setGameOverMsg] = useState('');

    useEffect(() => {
        if (!user) return;
        socket.emit('join_room', roomId);

        socket.on('game_state', (state) => {
            setGameState(state);
            if (state.status !== 'playing') setGameOverMsg(state.status === 'draw' ? '¡Empate!' : (state.winner === user.id ? '¡Ganaste! 🎉 +50 Pts' : '¡Perdiste! 😞 -15 Pts'));
        });

        return () => socket.off('game_state');
    }, [roomId, socket, user]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Generando Tablero Geométrico...</div>;

    const isMyTurn = gameState.turn === user.id;

    // Mapping colors to center-start angles
    const colorAngles = { yellow: 0, blue: 90, red: 180, green: 270 };
    // Colors hex mappings
    const colorHex = { yellow: '#eab308', blue: '#3b82f6', red: '#ef4444', green: '#22c55e' };

    const getParchisTokenStyle = (tokenObj) => {
        const { pos, status, color } = tokenObj;
        
        let x = 0, y = 0;
        
        if (status === 'home') {
            // Home corners dynamically placed based on color
            const homeAngleRad = (colorAngles[color] - 90 + 45) * (Math.PI / 180); // diagonal corners
            x = Math.cos(homeAngleRad) * 260 + (Math.random()*20 - 10);
            y = Math.sin(homeAngleRad) * 260 + (Math.random()*20 - 10);
        } else if (status === 'active' && pos < 68) {
            // Global standard track
            // Local pos needs mapping: yellow starts 0, blue 17, red 34, green 51
            const startOffsets = { yellow: 0, blue: 17, red: 34, green: 51 };
            const globalPos = (pos + startOffsets[color]) % 68;
            const coords = getPolarCoordinates(globalPos);
            x = coords.x;
            y = coords.y;
        } else if (status === 'active' || status === 'goal') {
            // Goal path
            const coords = getGoalCoordinates(pos, colorAngles[color]);
            x = coords.x;
            y = coords.y;
        }

        return {
            position: 'absolute',
            width: '24px', height: '24px',
            borderRadius: '50%',
            backgroundColor: colorHex[color],
            border: '2px solid #fff',
            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
            transform: `translate(calc(${x}px - 12px), calc(${y}px - 12px))`,
            transition: 'transform 0.5s ease',
            cursor: isMyTurn ? 'pointer' : 'default',
            zIndex: status === 'home' ? 5 : 10
        };
    };

    const handleRoll = () => {
        if (!isMyTurn || gameState.diceRoll !== null) return;
        socket.emit('roll_parchis_dice', roomId);
    };

    const handleMove = (tokenId) => {
        if (!isMyTurn || gameState.diceRoll === null) return;
        socket.emit('move_parchis_token', { roomId, tokenId });
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', background: 'radial-gradient(circle at center, #0f172a, #000)' }}>
            
            <div className="glass-panel" style={{ padding: '1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} /> Salir
                </button>
                <div style={{ fontWeight: 'bold', color: isMyTurn ? '#4ade80' : '#f87171', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isMyTurn ? "¡Lanza los dados!" : `Esperando...`}
                    <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                        Dado: <strong style={{color: '#fff', fontSize: '1.4rem'}}>{gameState.diceRoll || '?'}</strong>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
                
                {/* Visual Geometry Board */}
                <div style={{ position: 'relative', width: '600px', height: '600px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 0 50px rgba(255,255,255,0.05)' }}>
                    
                    {/* Center Goal */}
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', zIndex: 1, boxShadow: '0 0 30px #fff' }}></div>
                    
                    {/* Render exact layout tracks via loops if desired, or skip for hyper-modern look */}
                    <svg width="600" height="600" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.1, zIndex: 0 }}>
                        <circle cx="300" cy="300" r="180" stroke="white" strokeWidth="40" fill="none" strokeDasharray="5 11" />
                        <line x1="300" y1="300" x2="300" y2="100" stroke="#eab308" strokeWidth="20" /> {/* Yellow Goal Path */}
                        <line x1="300" y1="300" x2="500" y2="300" stroke="#3b82f6" strokeWidth="20" /> {/* Blue Goal Path */}
                        <line x1="300" y1="300" x2="300" y2="500" stroke="#ef4444" strokeWidth="20" /> {/* Red Goal Path */}
                        <line x1="300" y1="300" x2="100" y2="300" stroke="#22c55e" strokeWidth="20" /> {/* Green Goal Path */}
                    </svg>

                    {/* Render Tokens */}
                    {Object.keys(gameState.tokens).map(pid => {
                        const isMe = pid === user.id;
                        return gameState.tokens[pid].map(t => (
                            <div 
                                key={pid + t.id} 
                                style={{
                                    ...getParchisTokenStyle(t),
                                    opacity: isMe ? 1 : 0.8,
                                    boxShadow: (isMe && gameState.diceRoll) ? `0 0 15px ${colorHex[t.color]}` : '0 4px 6px rgba(0,0,0,0.5)'
                                }}
                                onClick={() => isMe ? handleMove(t.id) : null}
                            ></div>
                        ));
                    })}
                </div>

                {isMyTurn && gameState.diceRoll === null && (
                    <button className="glass-button" style={{ marginTop: '2rem', padding: '1rem 3rem', fontSize: '1.5rem', background: '#eab308', animation: 'pulse 1s infinite' }} onClick={handleRoll}>
                        🎲 Tira los Dados
                    </button>
                )}

            </div>

            {gameOverMsg && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: '#fff' }}>{gameOverMsg}</h1>
                        <button className="glass-button" onClick={() => navigate('/')}>Volver al Lobby</button>
                    </div>
                </div>
            )}
        </div>
    );
}
