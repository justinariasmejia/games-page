import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User } from 'lucide-react';
import { Chessboard } from 'react-chessboard';

export default function ChessGame({ user, socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState(null);
    const [gameOverMsg, setGameOverMsg] = useState('');

    useEffect(() => {
        if (!user) return;
        socket.emit('join_room', roomId);

        socket.on('game_state', (state) => {
            setGameState(state);
            if (state.status !== 'playing') setGameOverMsg(state.status === 'draw' ? '¡Empate!' : (state.winner === user.id ? '¡Jaque Mate! Ganaste +50 Pts' : '¡Jaque Mate! Perdiste -15 Pts'));
        });

        return () => socket.off('game_state');
    }, [roomId, socket, user]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Cargando tablero...</div>;

    const onDrop = (sourceSquare, targetSquare, piece) => {
        // Only allow moves if it's our turn
        if (gameState.turn !== user.id || gameState.status !== 'playing') return false;

        // Optionally, detect pawn promotion to default explicitly to 'q' (Queen)
        const isPromotion = piece[1] === 'P' && (targetSquare[1] === '8' || targetSquare[1] === '1');
        
        socket.emit('play_chess_move', { roomId, sourceSquare, targetSquare, promotion: isPromotion ? 'q' : undefined });
        
        return true; 
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', background: 'radial-gradient(circle at center, #1f2937, #000)' }}>
            
            <div className="glass-panel" style={{ padding: '1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} /> Salir
                </button>
                <div style={{ fontWeight: 'bold', color: gameState.turn === user.id ? '#4ade80' : '#f87171', fontSize: '1.2rem' }}>
                    {gameState.turn === user.id ? "¡Tu Turno!" : `Pensando...`}
                    {gameState.isCheck && <span style={{ color: '#ef4444', marginLeft: '10px', animation: 'pulse 1s infinite' }}>¡JAQUE!</span>}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: '4rem', flexWrap: 'wrap', padding: '2rem' }}>
                
                {/* Chessboard */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', width: 'min(90vw, 500px)', height: 'min(90vw, 500px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                    <Chessboard 
                        position={gameState.fen} 
                        onPieceDrop={onDrop}
                        boardOrientation={gameState.orientation}
                        customDarkSquareStyle={{ backgroundColor: '#a855f7' }}
                        customLightSquareStyle={{ backgroundColor: '#f3e8ff' }}
                    />
                </div>

                {/* Info Panel */}
                <div className="glass-panel" style={{ padding: '2rem', width: '300px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <h2>Contrincante</h2>
                    {gameState.opponents.map(opp => (
                        <div key={opp.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#333', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {opp.avatarUrl ? <img src={opp.avatarUrl} alt="avatar" style={{width: '100%', height: '100%'}}/> : <User size={30} color="white" />}
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {opp.username || `Jugador_${opp.id.substring(0,4)}`}
                            </span>
                        </div>
                    ))}
                    
                    {gameOverMsg && (
                         <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', textAlign: 'center' }}>
                             <h3 style={{ color: '#fbbf24', margin: '0 0 1rem 0' }}>{gameOverMsg}</h3>
                             <button className="glass-button" onClick={() => navigate('/')}>Volver al Lobby</button>
                         </div>
                    )}
                </div>

            </div>
        </div>
    );
}
