import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';

const TRACK = [
    [7, 10], [6, 10], [5, 10], [4, 10], [3, 10], [2, 10], [1, 10], [0, 10], // 0-7
    [0, 9], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], // 8-16
    [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 17-24
    [9, 0], [10, 0], [10, 1], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], // 25-33
    [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], // 34-41
    [18, 9], [18, 10], [17, 10], [16, 10], [15, 10], [14, 10], [13, 10], [12, 10], [11, 10], // 42-50
    [10, 11], [10, 12], [10, 13], [10, 14], [10, 15], [10, 16], [10, 17], [10, 18], // 51-58
    [9, 18], [8, 18], [8, 17], [8, 16], [8, 15], [8, 14], [8, 13], [8, 12], [8, 11] // 59-67
];

const GOAL_TRACKS = {
    yellow: [[1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9]],
    green: [[9, 1], [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7]],
    red: [[17, 9], [16, 9], [15, 9], [14, 9], [13, 9], [12, 9], [11, 9]],
    blue: [[9, 17], [9, 16], [9, 15], [9, 14], [9, 13], [9, 12], [9, 11]],
};

const BASE_COORDS = {
    yellow: [[2, 13], [5, 13], [2, 16], [5, 16]], // Bottom-left
    green: [[2, 2], [5, 2], [2, 5], [5, 5]],      // Top-left
    red: [[13, 2], [16, 2], [13, 5], [16, 5]],    // Top-right
    blue: [[13, 13], [16, 13], [13, 16], [16, 16]] // Bottom-right
};

const START_OFFSETS = { yellow: 0, blue: 17, red: 34, green: 51 };

const CELL_SIZE = 30; // 30px per square
const SAFE_ZONES = [0, 17, 34, 51, 12, 29, 46, 63]; // Indices in TRACK

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
            if (state.status !== 'playing') {
                setGameOverMsg(state.winner === user.id ? '¡Ganaste el Parchís! +50 Pts' : 'Perdiste. Alguien llegó primero.');
            }
        });

        return () => socket.off('game_state');
    }, [roomId, socket, user]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Dibujando Tablero Clásico...</div>;

    const isMyTurn = gameState.turn === user.id;

    // Build the grid background squares
    const renderBackgroundCells = () => {
        const cells = [];
        // Loop standard track
        TRACK.forEach((coord, i) => {
            const isSafe = SAFE_ZONES.includes(i);
            const isYellowStart = i === START_OFFSETS.yellow;
            const isBlueStart = i === START_OFFSETS.blue;
            const isRedStart = i === START_OFFSETS.red;
            const isGreenStart = i === START_OFFSETS.green;
            
            let bg = '#fff';
            if (isYellowStart) bg = '#fef08a';
            if (isBlueStart) bg = '#bfdbfe';
            if (isRedStart) bg = '#fecaca';
            if (isGreenStart) bg = '#bbf7d0';
            if (isSafe && bg === '#fff') bg = '#e5e7eb';

            cells.push(
                <div key={`path-${i}`} style={{
                    position: 'absolute', left: coord[0] * CELL_SIZE, top: coord[1] * CELL_SIZE,
                    width: CELL_SIZE, height: CELL_SIZE, boxSizing: 'border-box', border: '1px solid #999', backgroundColor: bg,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    {isSafe && <span style={{ color: '#aaa', fontSize: '10px' }}>★</span>}
                </div>
            );
        });

        // Loop Goal paths
        Object.entries(GOAL_TRACKS).forEach(([color, path]) => {
            let bg = '';
            if (color === 'yellow') bg = '#eab308';
            if (color === 'red') bg = '#ef4444';
            if (color === 'blue') bg = '#3b82f6';
            if (color === 'green') bg = '#22c55e';
            
            path.forEach((coord, i) => {
                cells.push(
                    <div key={`goal-${color}-${i}`} style={{
                        position: 'absolute', left: coord[0] * CELL_SIZE, top: coord[1] * CELL_SIZE,
                        width: CELL_SIZE, height: CELL_SIZE, boxSizing: 'border-box', border: '1px solid #rgba(0,0,0,0.1)', backgroundColor: bg
                    }}></div>
                );
            });
        });

        // Center Triangle / Goal area (occupies center 3x3)
        cells.push(
            <div key="center-goal" style={{
                position: 'absolute', left: 8 * CELL_SIZE, top: 8 * CELL_SIZE,
                width: 3 * CELL_SIZE, height: 3 * CELL_SIZE, backgroundColor: '#333',
                backgroundImage: 'conic-gradient(from 45deg, #eab308 0deg 90deg, #22c55e 90deg 180deg, #ef4444 180deg 270deg, #3b82f6 270deg 360deg)'
            }}></div>
        );

        // Render bases (large squares corners)
        const block = 8 * CELL_SIZE; // width of base
        cells.push(<div key="base-green" style={{ position: 'absolute', left: 0, top: 0, width: block, height: block, border: '4px solid #22c55e', backgroundColor: '#dcfce7', borderRadius: '16px' }}></div>);
        cells.push(<div key="base-red" style={{ position: 'absolute', left: 11 * CELL_SIZE, top: 0, width: block, height: block, border: '4px solid #ef4444', backgroundColor: '#fee2e2', borderRadius: '16px' }}></div>);
        cells.push(<div key="base-yellow" style={{ position: 'absolute', left: 0, top: 11 * CELL_SIZE, width: block, height: block, border: '4px solid #eab308', backgroundColor: '#fef9c3', borderRadius: '16px' }}></div>);
        cells.push(<div key="base-blue" style={{ position: 'absolute', left: 11 * CELL_SIZE, top: 11 * CELL_SIZE, width: block, height: block, border: '4px solid #3b82f6', backgroundColor: '#dbeafe', borderRadius: '16px' }}></div>);

        return cells;
    };

    const getColorHex = (c) => ({ yellow: '#eab308', blue: '#3b82f6', red: '#ef4444', green: '#22c55e' })[c];

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', background: '#1e1e1e' }}>
            
            <div className="glass-panel" style={{ padding: '1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} /> Salir
                </button>
                <div style={{ fontWeight: 'bold', color: isMyTurn ? '#4ade80' : '#f87171', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isMyTurn ? "¡Lanza los dados!" : `Esperando...`}
                    <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', cursor: (isMyTurn && gameState.diceRoll === null) ? 'pointer' : 'default', border: (isMyTurn && gameState.diceRoll === null) ? '2px solid #eab308' : 'none' }}
                         onClick={() => { if (isMyTurn && gameState.diceRoll === null) socket.emit('roll_parchis_dice', roomId); }}>
                        Dado: <strong style={{color: '#fff', fontSize: '1.4rem'}}>{gameState.diceRoll || '🎲'}</strong>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                <div style={{ position: 'relative', width: 19 * CELL_SIZE, height: 19 * CELL_SIZE, background: '#444', border: '8px solid #2e1065', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                    
                    {renderBackgroundCells()}

                    {/* Render Tokens */}
                    {Object.keys(gameState.tokens).map(pid => {
                        const isMe = pid === user.id;
                        return gameState.tokens[pid].map(t => {
                            let cx = 0, cy = 0;
                            if (t.status === 'home') {
                                // Draw them inside their base visually spaced out
                                const coords = BASE_COORDS[t.color][t.id - 1];
                                cx = coords[0] * CELL_SIZE + CELL_SIZE/2;
                                cy = coords[1] * CELL_SIZE + CELL_SIZE/2;
                            } else if (t.status === 'active' && t.pos < 68) {
                                // On the universal track
                                const globalPos = (t.pos + START_OFFSETS[t.color]) % 68;
                                cx = TRACK[globalPos][0] * CELL_SIZE + CELL_SIZE/2;
                                cy = TRACK[globalPos][1] * CELL_SIZE + CELL_SIZE/2;
                            } else if (t.status === 'active' && t.pos >= 68 && t.pos <= 74) {
                                // Goal path
                                cx = GOAL_TRACKS[t.color][t.pos - 68][0] * CELL_SIZE + CELL_SIZE/2;
                                cy = GOAL_TRACKS[t.color][t.pos - 68][1] * CELL_SIZE + CELL_SIZE/2;
                            } else if (t.status === 'goal') {
                                // Placed in the center goal area
                                cx = 9.5 * CELL_SIZE + (Math.random()*15 - 7);
                                cy = 9.5 * CELL_SIZE + (Math.random()*15 - 7);
                            }

                            return (
                                <div 
                                    key={pid + t.id} 
                                    style={{
                                        position: 'absolute',
                                        left: cx - 12, top: cy - 12,
                                        width: '24px', height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: getColorHex(t.color),
                                        border: '3px solid #fff',
                                        boxShadow: (isMe && gameState.diceRoll) ? `0 0 10px #fff` : '0 2px 5px rgba(0,0,0,0.5)',
                                        transform: (isMe && gameState.diceRoll) ? 'scale(1.2)' : 'none',
                                        transition: 'all 0.3s ease',
                                        cursor: isMe ? 'pointer' : 'default',
                                        zIndex: 10 + t.id
                                    }}
                                    onClick={() => { if (isMe) socket.emit('move_parchis_token', { roomId, tokenId: t.id }); }}
                                >
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)' }}/>
                                </div>
                            );
                        });
                    })}
                </div>
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
