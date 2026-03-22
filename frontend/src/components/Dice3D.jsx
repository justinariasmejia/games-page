import React, { useState, useEffect } from 'react';
import './Dice3D.css';

export default function Dice3D({ value, isRolling, onClick }) {
    const [localValue, setLocalValue] = useState(value || 1);

    useEffect(() => {
        if (!isRolling && value) {
            // Un pequeño delay para que parezca que cae después de rodar
            setTimeout(() => {
                setLocalValue(value);
            }, 600);
        }
    }, [isRolling, value]);

    return (
        <div className={`dice-container ${isRolling ? 'rolling' : ''}`} onClick={onClick}>
            <div className={`dice show-${localValue}`}>
                <div className="face face-1">
                    <span className="dot center"></span>
                </div>
                <div className="face face-2">
                    <span className="dot top-left"></span>
                    <span className="dot bottom-right"></span>
                </div>
                <div className="face face-3">
                    <span className="dot top-left"></span>
                    <span className="dot center"></span>
                    <span className="dot bottom-right"></span>
                </div>
                <div className="face face-4">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                </div>
                <div className="face face-5">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot center"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                </div>
                <div className="face face-6">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot middle-left"></span>
                    <span className="dot middle-right"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                </div>
            </div>
        </div>
    );
}
