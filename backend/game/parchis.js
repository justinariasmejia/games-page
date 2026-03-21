class ParchisGame {
    constructor(playerIds) {
        this.playersList = playerIds; // up to 4
        this.colors = ['yellow', 'blue', 'red', 'green'];
        this.tokens = {};
        this.startPositions = { yellow: 0, blue: 17, red: 34, green: 51 };
        
        this.playersList.forEach((id, idx) => {
            const c = this.colors[idx];
            this.tokens[id] = [
                { id: 1, pos: -1, color: c, status: 'home' },
                { id: 2, pos: -1, color: c, status: 'home' },
                { id: 3, pos: -1, color: c, status: 'home' },
                { id: 4, pos: -1, color: c, status: 'home' }
            ];
        });
        
        this.turnIndex = 0;
        this.diceRoll = null;
        this.status = 'playing';
        this.winner = null;
    }

    rollDice(playerId) {
        if (this.playersList[this.turnIndex] !== playerId || this.diceRoll !== null) return false;
        
        this.diceRoll = Math.floor(Math.random() * 6) + 1;
        
        // Auto-skip if no legal moves
        const canMove = this.tokens[playerId].some(t => {
            if (t.status === 'goal') return false;
            if (t.status === 'home' && this.diceRoll === 5) return true;
            if (t.status === 'active' && t.pos + this.diceRoll <= 72) return true; // 68 + 4 goal path
            return false;
        });

        if (!canMove) {
            this.nextTurn();
        }
        return true;
    }

    moveToken(playerId, tokenId) {
        if (this.playersList[this.turnIndex] !== playerId || this.diceRoll === null) return false;
        const color = this.tokens[playerId][0].color;
        const token = this.tokens[playerId].find(t => t.id === tokenId);
        if (!token) return false;

        // Move out of home
        if (token.status === 'home' && this.diceRoll === 5) {
            token.status = 'active';
            token.pos = 0; 
            
            // Technically in real parchis you keep playing if you got 5, but MVP ends turn.
            this.diceRoll = null;
            this.nextTurn();
            return true;
        }

        // Standard move
        if (token.status === 'active') {
            const nextPos = token.pos + this.diceRoll;
            if (nextPos > 72) return false; // Must reach goal exactly
            
            token.pos = nextPos;
            if (token.pos === 72) token.status = 'goal';
            
            // Capture logic MVP
            if (token.status === 'active' && token.pos < 68) {
                const globalPos = (token.pos + this.startPositions[color]) % 68;
                // Check if someone else is on this global square (unless it's a safe zone)
                const safeZones = [0, 17, 34, 51, 12, 29, 46, 63];
                if (!safeZones.includes(globalPos)) {
                    this.playersList.forEach(pid => {
                        if (pid !== playerId) {
                            this.tokens[pid].forEach(t => {
                                if (t.status === 'active' && t.pos < 68) {
                                    const oppGlobal = (t.pos + this.startPositions[t.color]) % 68;
                                    if (oppGlobal === globalPos) {
                                        t.status = 'home'; // Captured!
                                        t.pos = -1;
                                    }
                                }
                            });
                        }
                    });
                }
            }

            const earnedExtraRoll = this.diceRoll === 6;
            this.diceRoll = null;
            this.checkWin();
            
            if (!earnedExtraRoll) this.nextTurn();
            return true;
        }
        
        return false;
    }

    nextTurn() {
        this.diceRoll = null;
        this.turnIndex = (this.turnIndex + 1) % this.playersList.length;
    }

    checkWin() {
        const winner = this.playersList.find(pid => this.tokens[pid].every(t => t.status === 'goal'));
        if (winner) {
            this.status = 'finished';
            this.winner = winner;
        }
    }

    getState(forPlayerId) {
        const opponents = this.playersList.filter(id => id !== forPlayerId).map(id => ({ id }));
        return {
            tokens: this.tokens,
            turn: this.playersList[this.turnIndex],
            diceRoll: this.diceRoll,
            status: this.status,
            winner: this.winner,
            opponents,
            myColor: this.tokens[forPlayerId] ? this.tokens[forPlayerId][0].color : null
        };
    }
}

module.exports = ParchisGame;
