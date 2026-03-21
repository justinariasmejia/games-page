import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import DominoTile from './DominoTile';

export default function DominoesGame({ user, socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState(null);
    const [selectedTileIndex, setSelectedTileIndex] = useState(null);
    const [gameOverMsg, setGameOverMsg] = useState('');

    useEffect(() => {
        socket.emit('join_room', roomId);

        socket.on('game_state', (state) => {
            setGameState(state);
            setSelectedTileIndex(null);
        });

        socket.on('game_over', ({ winner }) => {
            if (winner === 'draw') setGameOverMsg('Game Blocked - It is a Draw!');
            else if (winner === user.id) setGameOverMsg('You Win! +50 Points');
            else setGameOverMsg('You Lose! -15 Points');
        });

        return () => {
            socket.off('game_state');
            socket.off('game_over');
        };
    }, [roomId, socket, user.id]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Loading Match Data...</div>;

    const isMyTurn = gameState.turn === user.id;

    const handleTileClick = (index) => {
        if (!isMyTurn) return;
        const tile = gameState.myHand[index];
        const ends = getPlayableEnds();
        
        let validLeft = tile[0] === ends.left || tile[1] === ends.left || ends.left === 'any';
        let validRight = tile[0] === ends.right || tile[1] === ends.right || ends.right === 'any';

        if (validLeft && validRight && ends.left !== 'any') {
            setSelectedTileIndex(index);
        } else if (validLeft) {
            socket.emit('play_tile', { roomId, tileIndex: index, side: 'left' });
        } else if (validRight) {
            socket.emit('play_tile', { roomId, tileIndex: index, side: 'right' });
        } else {
            console.log("Invalid move");
        }
    };

    const playSide = (side) => {
        if (selectedTileIndex !== null) {
            socket.emit('play_tile', { roomId, tileIndex: selectedTileIndex, side });
            setSelectedTileIndex(null);
        }
    };

    const getPlayableEnds = () => {
        if (gameState.board.length === 0) return { left: 'any', right: 'any' };
        return {
            left: gameState.board[0][0],
            right: gameState.board[gameState.board.length - 1][1]
        };
    };

    const canIPlay = () => {
        const ends = getPlayableEnds();
        return gameState.myHand.some(tile => 
            tile[0] === ends.left || tile[1] === ends.left ||
            tile[0] === ends.right || tile[1] === ends.right || ends.left === 'any'
        );
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between' }}>
            {/* Header */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} /> Salir
                </button>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    {gameState.opponents.map((opp, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#ccc' }}>Jugador {opp.id.substring(0,4)}</div>
                            <h3 style={{ margin: 0, color: '#fff' }}><span style={{ color: '#a855f7' }}>{opp.tileCount}</span> fichas</h3>
                        </div>
                    ))}
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #444', paddingLeft: '2rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>En pozo:</div>
                        <h3 style={{ margin: 0, color: '#fff' }}>{gameState.boneyardCount} restantes</h3>
                    </div>
                </div>
                <div style={{ fontWeight: 'bold', color: isMyTurn ? '#4ade80' : '#f87171', fontSize: '1.2rem' }}>
                    {isMyTurn ? "¡Tu Turno!" : gameState.turn ? `Turno de ${gameState.turn.substring(0,4)}` : ''}
                </div>
            </div>

            {/* Board */}
            <div className="glass-panel" style={{ flex: 1, margin: '2rem 0', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', background: 'rgba(0,0,0,0.3)' }}>
                {gameState.board.length === 0 ? (
                    <div style={{ color: '#666', fontSize: '2rem', fontWeight: 'bold' }}>Empty Board</div>
                ) : (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {gameState.board.map((tile, i) => (
                            <DominoTile 
                                key={i}
                                topNumber={tile[0]} 
                                bottomNumber={tile[1]} 
                                isHorizontal={true} 
                                isDouble={tile[0] === tile[1]} 
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* My Hand & Actions */}
            <div className="glass-panel" style={{ padding: '1.5rem', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Tu Mano ({gameState.myHand.length})</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {!canIPlay() && isMyTurn && gameState.boneyardCount > 0 && (
                            <button className="glass-button" onClick={() => socket.emit('draw_tile', roomId)}>Robar Ficha del Pozo</button>
                        )}
                        {!canIPlay() && isMyTurn && gameState.boneyardCount === 0 && (
                            <button className="glass-button" onClick={() => socket.emit('pass_turn', roomId)}>Pasar Turno</button>
                        )}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'center' }}>
                    {gameState.myHand.map((tile, i) => (
                        <div 
                            key={i} 
                            onClick={() => handleTileClick(i)}
                            style={{ 
                                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                                transform: selectedTileIndex === i ? 'translateY(-10px)' : 'none',
                                transition: 'transform 0.2s',
                                opacity: isMyTurn ? 1 : 0.6,
                                boxShadow: selectedTileIndex === i ? '0 10px 20px rgba(168, 85, 247, 0.4)' : 'none',
                                borderRadius: '8px'
                            }}
                        >
                            <DominoTile 
                                topNumber={tile[0]} 
                                bottomNumber={tile[1]} 
                                isHorizontal={false} 
                                isDouble={tile[0] === tile[1]} 
                            />
                        </div>
                    ))}
                </div>

                {selectedTileIndex !== null && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <p style={{ margin: '0 0 1rem 0' }}>¿Dónde quieres jugar esta ficha?</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                            <button className="glass-button" onClick={() => playSide('left')}>Jugar Izquierda</button>
                            <button className="glass-button" onClick={() => playSide('right')}>Jugar Derecha</button>
                            <button className="glass-button-secondary" onClick={() => setSelectedTileIndex(null)}>Cancelar</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Over Modal */}
            {gameOverMsg && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', background: '-webkit-linear-gradient(#fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {gameOverMsg.includes('Win') ? '¡Ganaste! 🎉 +50 Pts' : gameOverMsg.includes('Lose') ? '¡Perdiste! 😞 -15 Pts' : '¡Trancado! Es un empate.'}
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
