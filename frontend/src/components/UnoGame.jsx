import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, AlertCircle } from 'lucide-react';

const UnoCard = ({ color, type, value, onClick, selected }) => {
    let bgColor = '#1f2937';
    if (color === 'red') bgColor = '#ef4444';
    if (color === 'blue') bgColor = '#3b82f6';
    if (color === 'green') bgColor = '#22c55e';
    if (color === 'yellow') bgColor = '#eab308';

    let displayTxt = value !== null ? value : '';
    if (type === 'skip') displayTxt = '⊘';
    if (type === 'reverse') displayTxt = '⟲';
    if (type === 'draw2') displayTxt = '+2';
    if (type === 'wild') displayTxt = 'WILD';
    if (type === 'wild_draw4') displayTxt = '+4';

    return (
        <div 
            onClick={onClick}
            style={{ 
                width: '80px', 
                height: '120px', 
                backgroundColor: bgColor, 
                borderRadius: '8px',
                border: selected ? '4px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selected ? '0 10px 25px rgba(255,255,255,0.3)' : '0 4px 6px rgba(0,0,0,0.3)',
                cursor: onClick ? 'pointer' : 'default',
                transform: selected ? 'translateY(-15px)' : 'none',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{ 
                position: 'absolute', 
                top: '5px', left: '8px', 
                fontSize: '1rem', 
                color: '#fff', 
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}>
                {displayTxt !== 'WILD' ? displayTxt : 'W'}
            </div>
            <div style={{
                background: '#fff',
                width: '60px', height: '90px',
                borderRadius: '50%',
                transform: 'rotate(-25deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: bgColor !== '#1f2937' ? bgColor : '#000',
                fontSize: type.includes('wild') ? '1.5rem' : '2.5rem',
                fontWeight: '900',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
            }}>
                <div style={{ transform: 'rotate(25deg)' }}>
                    {displayTxt}
                </div>
            </div>
        </div>
    );
};

export default function UnoGame({ user, socket }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [gameState, setGameState] = useState(null);
    const [selectedCardIndex, setSelectedCardIndex] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [gameOverMsg, setGameOverMsg] = useState('');

    useEffect(() => {
        if (!user) return;
        socket.emit('join_room', roomId);

        socket.on('game_state', (state) => {
            setGameState(state);
            setSelectedCardIndex(null);
            setShowColorPicker(false);
        });

        socket.on('game_over', ({ winner }) => {
            if (winner === user.id) setGameOverMsg('¡Ganaste! 🎉 +50 Pts');
            else setGameOverMsg('¡Perdiste! 😞 -15 Pts');
        });

        return () => {
            socket.off('game_state');
            socket.off('game_over');
        };
    }, [roomId, socket, user]);

    if (!gameState) return <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>Cargando Mesa...</div>;

    const isMyTurn = gameState.turn === user.id;

    const handleCardClick = (index) => {
        if (!isMyTurn) return;
        const card = gameState.myHand[index];
        
        // Validate if card can be played locally before sending or showing picker
        const topCard = gameState.topCard;
        const isValid = card.color === 'wild' || card.color === gameState.currentColor || (card.type === topCard?.type && card.value === topCard?.value);
        
        if (!isValid) return;

        setSelectedCardIndex(index);
        
        if (card.color === 'wild') {
            setShowColorPicker(true);
        } else {
            // Play normally
            socket.emit('play_uno_card', { roomId, cardIndex: index, chosenColor: null });
        }
    };

    const handleColorChoice = (color) => {
        socket.emit('play_uno_card', { roomId, cardIndex: selectedCardIndex, chosenColor: color });
        setShowColorPicker(false);
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between', background: 'radial-gradient(circle at center, #2e1065, #000)' }}>
            
            {/* Header & Opponents */}
            <div className="glass-panel" style={{ padding: '1rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="glass-button-secondary" onClick={() => navigate('/')} style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={20} /> Salir
                </button>
                
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                    {gameState.opponents.map(opp => (
                        <div key={opp.id} className="glass-panel" style={{ flex: 1, minWidth: '120px', textAlign: 'center', position: 'relative', overflow: 'hidden', padding: '0.5rem', border: opp.id === gameState.turn ? '2px solid #4ade80' : '2px solid transparent' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ width: '25px', height: '25px', borderRadius: '50%', background: '#333', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    {opp.avatarUrl ? <img src={opp.avatarUrl} alt="avatar" style={{width: '100%', height: '100%'}}/> : <User size={15} color="white" />}
                                </div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: opp.profileConfig?.color || '#fff' }}>
                                    {opp.username || `Jugador_${opp.id.substring(0,4)}`}
                                </span>
                            </div>
                            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {opp.cardCount} cartas
                            </div>
                            {opp.id === gameState.turn && (
                                <div style={{ position: 'absolute', top: 0, right: 0, background: '#4ade80', color: '#000', fontSize: '0.6rem', padding: '0.1rem 0.3rem', fontWeight: 'bold', borderBottomLeftRadius: '4px' }}>
                                    Jugando
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ fontWeight: 'bold', color: isMyTurn ? '#4ade80' : '#f87171', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isMyTurn ? "¡Tu Turno!" : `Esperando...`}
                    <div style={{ fontSize: '1.5rem' }}>{gameState.direction === 1 ? '↻' : '↺'}</div>
                </div>
            </div>

            {/* Play Area */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '20px', border: `2px solid ${gameState.currentColor === 'red' ? '#ef4444' : gameState.currentColor === 'blue' ? '#3b82f6' : gameState.currentColor === 'green' ? '#22c55e' : gameState.currentColor === 'yellow' ? '#eab308' : '#fff'}` }}>
                     Color Actual: <strong style={{ textTransform: 'uppercase' }}>{gameState.currentColor}</strong>
                </div>

                <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                    {/* Deck */}
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', cursor: isMyTurn ? 'pointer' : 'default' }} onClick={() => isMyTurn && socket.emit('draw_uno_card', roomId)}>
                        <div style={{ width: '100px', height: '150px', background: 'repeating-linear-gradient(45deg, #000, #000 10px, #1f2937 10px, #1f2937 20px)', borderRadius: '8px', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                            <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '900', transform: 'rotate(-20deg)', textShadow: '2px 2px 0 #ef4444' }}>UNO</span>
                        </div>
                        <div style={{ marginTop: '0.5rem', color: '#aaa', fontWeight: 'bold' }}>{gameState.deckCount} cartas</div>
                        {isMyTurn && <p style={{ margin: '0.5rem 0 0', color: '#4ade80', fontSize: '0.8rem' }}>Toca para robar</p>}
                    </div>

                    {/* Discard Pile */}
                    <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                        {gameState.topCard ? (
                            <UnoCard {...gameState.topCard} />
                        ) : (
                            <div style={{ width: '80px', height: '120px', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}></div>
                        )}
                        <div style={{ marginTop: '0.5rem', color: '#aaa', fontWeight: 'bold' }}>Mesa</div>
                    </div>
                </div>
            </div>

            {/* My Hand */}
            <div className="glass-panel" style={{ padding: '1.5rem', margin: '1rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        Tu Mano ({gameState.myHand.length})
                        {gameState.myHand.length === 2 && isMyTurn && (
                            <button className="glass-button" style={{ background: '#ef4444', animation: 'pulse 1s infinite' }} onClick={() => socket.emit('call_uno', roomId)}>
                                ¡Gritar UNO!
                            </button>
                        )}
                    </h3>
                </div>
                
                <div style={{ display: 'flex', gap: '-20px', paddingBottom: '2rem', paddingTop: '1rem', minWidth: 'min-content' }}>
                    {gameState.myHand.map((card, idx) => (
                        <div key={idx} style={{ marginLeft: idx > 0 ? '-30px' : '0', transition: 'margin 0.2s', zIndex: idx, ':hover': { zIndex: 100 } }}>
                            <UnoCard 
                                {...card} 
                                selected={selectedCardIndex === idx}
                                onClick={() => handleCardClick(idx)} 
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Color Picker Modal for Wild Cards */}
            {showColorPicker && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                        <h2>Elige un Color</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <button onClick={() => handleColorChoice('red')} style={{ height: '80px', background: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}></button>
                            <button onClick={() => handleColorChoice('blue')} style={{ height: '80px', background: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}></button>
                            <button onClick={() => handleColorChoice('green')} style={{ height: '80px', background: '#22c55e', border: 'none', borderRadius: '8px', cursor: 'pointer' }}></button>
                            <button onClick={() => handleColorChoice('yellow')} style={{ height: '80px', background: '#eab308', border: 'none', borderRadius: '8px', cursor: 'pointer' }}></button>
                        </div>
                    </div>
                </div>
            )}

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
