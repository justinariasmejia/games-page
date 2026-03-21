import React, { useState, useEffect, useRef } from 'react';
import { User, X, Gamepad2, Settings, Volume2, VolumeX } from 'lucide-react';

export default function ProfileModal({ userProfile, currentUser, onClose, onSave, onChallenge }) {
    const [editMode, setEditMode] = useState(false);
    const [color, setColor] = useState(userProfile?.profileConfig?.color || '#6366f1');
    const [bgUrl, setBgUrl] = useState(userProfile?.profileConfig?.bgUrl || '');
    const [musicUrl, setMusicUrl] = useState(userProfile?.profileConfig?.musicUrl || '');
    const [volume, setVolume] = useState(0.2);
    const audioRef = useRef(null);

    const isMe = currentUser.id === userProfile.id;

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const handleSave = () => {
        onSave({ color, bgUrl, musicUrl });
        setEditMode(false);
    };

    // YouTube detector
    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const ytId = getYoutubeId(userProfile?.profileConfig?.musicUrl);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            {/* Backdrop */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={onClose} />
           
            {/* Modal Card */}
            <div className="glass-panel" style={{ 
                position: 'relative', 
                width: '90%', 
                maxWidth: '450px', 
                overflow: 'hidden', 
                padding: 0,
                border: `2px solid ${userProfile?.profileConfig?.color || '#6366f1'}`,
                boxShadow: `0 0 30px ${userProfile?.profileConfig?.color || '#6366f1'}44`
            }}>
                
                {/* Background Image / Banner */}
                <div style={{ 
                    height: '180px', 
                    width: '100%', 
                    background: userProfile?.profileConfig?.bgUrl ? `url(${userProfile.profileConfig.bgUrl}) center/cover` : `linear-gradient(135deg, ${userProfile?.profileConfig?.color || '#6366f1'}88, transparent)`,
                    borderBottom: '1px solid rgba(255,255,255,0.1)' 
                }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                    {isMe && !editMode && (
                        <button onClick={() => setEditMode(true)} style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            <Settings size={14} /> Editar Perfil
                        </button>
                    )}
                    
                    {/* Custom Volume Controls (Top Right beside Close button) */}
                    {userProfile?.profileConfig?.musicUrl && !editMode && !ytId && (
                        <div style={{ position: 'absolute', top: '10px', right: '50px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px' }}>
                            <Volume2 size={16} color="#fff" />
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume} 
                                onChange={e => setVolume(parseFloat(e.target.value))} 
                                style={{ width: '60px', height: '4px', cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>

                {/* Avatar Overlapping Banner */}
                <div style={{ position: 'relative', marginTop: '-50px', marginLeft: '2rem', width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #1a1a2e', background: '#333', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userProfile.avatarUrl ? <img src={userProfile.avatarUrl} alt="avatar" style={{width: '100%', height: '100%'}}/> : <User size={50} color="white" />}
                </div>

                {/* Body Content */}
                <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
                    {!editMode ? (
                        <>
                            <h2 style={{ margin: '0 0 0.2rem 0', fontSize: '1.8rem', color: userProfile?.profileConfig?.color || '#fff' }}>{userProfile.username || 'Desconocido'}</h2>
                            <p style={{ margin: '0 0 1.5rem 0', color: '#a855f7', fontWeight: 'bold' }}>🪙 {userProfile.points} pts globales</p>
                            
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Victorias</div>
                                    <div style={{ fontSize: '1.5rem', color: '#4ade80', fontWeight: 'bold' }}>{userProfile.wins}</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Derrotas</div>
                                    <div style={{ fontSize: '1.5rem', color: '#f87171', fontWeight: 'bold' }}>{userProfile.losses}</div>
                                </div>
                            </div>

                            {/* Music Player Hidden Core */}
                            {userProfile?.profileConfig?.musicUrl && !editMode && (
                                <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                                    {ytId ? (
                                        <iframe width="10" height="10" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&loop=1&playlist=${ytId}&controls=0`} title="YouTube hidden video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                    ) : (
                                        <audio ref={audioRef} autoPlay loop src={userProfile.profileConfig.musicUrl} />
                                    )}
                                </div>
                            )}

                            {!isMe && (
                                <button className="glass-button" onClick={() => { onClose(); onChallenge(userProfile.id); }} style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', background: `linear-gradient(90deg, ${userProfile?.profileConfig?.color || '#6366f1'}, #a855f7)` }}>
                                    <Gamepad2 size={24} /> Desafiar a jugar
                                </button>
                            )}
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0' }}>Personalizar Tarjeta</h3>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Color Favorito (Hex)</label>
                                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%', height: '40px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Fondo de Banner (URL Imagen/GIF)</label>
                                <input type="text" className="glass-input" value={bgUrl} onChange={e => setBgUrl(e.target.value)} placeholder="https://ejemplo.com/fondo.gif" />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '4px' }}>Música de Perfil (Audio directo o YouTube)</label>
                                <input type="text" className="glass-input" value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="Ej: Link a YouTube o a un .mp3" />
                                <span style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px', display: 'block' }}>Soporta enlaces de YouTube o archivos directos de audio.</span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="glass-button" onClick={handleSave} style={{ flex: 1, background: '#4ade80' }}>Guardar</button>
                                <button className="glass-button-secondary" onClick={() => { setEditMode(false); setColor(userProfile?.profileConfig?.color || '#6366f1'); setBgUrl(userProfile?.profileConfig?.bgUrl || ''); setMusicUrl(userProfile?.profileConfig?.musicUrl || ''); }} style={{ flex: 1 }}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
