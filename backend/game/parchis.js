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
        this.originalRoll = []; // Displaying the 2 graphical dice
        this.diceRoll = [];     // Array of pending moves to consume
        this.status = 'playing';
        this.winner = null;
        
        this.consecutiveDoubles = 0;
        this.earnedExtraTurn = false;
        this.lastMovedTokenId = null;
        this.awaitingReward = false;
    }

    rollDice(playerId) {
        if (this.playersList[this.turnIndex] !== playerId || this.diceRoll.length > 0) return false;
        
        let d1 = Math.floor(Math.random() * 6) + 1;
        let d2 = Math.floor(Math.random() * 6) + 1;
        
        this.diceRoll = [d1, d2];
        this.originalRoll = [d1, d2];
        this.awaitingReward = false;

        const isDouble = d1 === d2;
        this.earnedExtraTurn = isDouble;

        if (isDouble) {
            this.consecutiveDoubles++;
            if (this.consecutiveDoubles === 3) {
                // Castigo: 3 dobles seguidos -> a casa la ficha más avanzada
                let furthest = null;
                this.tokens[playerId].forEach(t => {
                    if (t.status === 'active' && t.pos < 75) {
                        if (!furthest || t.pos > furthest.pos) furthest = t;
                    }
                });
                
                if (furthest) {
                    furthest.status = 'home';
                    furthest.pos = -1;
                }
                
                this.diceRoll = [];
                this.originalRoll = [];
                this.consecutiveDoubles = 0;
                this.earnedExtraTurn = false;
                this.nextTurn();
                return true;
            }
        } else {
            this.consecutiveDoubles = 0;
        }

        this.autoSkipIfStuck(playerId);
        return true;
    }

    canSpawn(playerId) {
        const c = this.tokens[playerId][0].color;
        const startGlobal = this.startPositions[c];
        let count = 0;
        for (const pid of this.playersList) {
            for (const t of this.tokens[pid]) {
                if (t.status === 'active' && t.pos < 68) {
                    const gPos = (t.pos + this.startPositions[t.color]) % 68;
                    if (gPos === startGlobal) count++;
                }
            }
        }
        return count < 2;
    }

    autoSkipIfStuck(playerId) {
        if (this.diceRoll.length === 0) {
            if (this.earnedExtraTurn) {
                this.earnedExtraTurn = false;
            } else {
                this.nextTurn();
            }
            return;
        }

        let canMoveAtAll = false;
        for (const die of this.diceRoll) {
            if (this.tokens[playerId].some(t => {
                if (t.status === 'goal') return false;
                if (t.status === 'home') {
                    return (die === 5 && this.canSpawn(playerId));
                }
                return this.isValidMove(playerId, t, die);
            })) {
                canMoveAtAll = true;
                break;
            }
        }

        if (!canMoveAtAll) {
            this.diceRoll = [];
            if (this.earnedExtraTurn) {
                this.earnedExtraTurn = false;
            } else {
                this.nextTurn();
            }
        }
    }

    isValidMove(playerId, token, spaces) {
        if (token.status !== 'active') return false;
        if (token.pos + spaces > 75) return false;
        
        const color = token.color;
        const myStartPos = this.startPositions[color];
        
        for (let i = 1; i <= spaces; i++) {
            const checkPos = token.pos + i;
            if (checkPos < 68) {
                let checkGlobal = (checkPos + myStartPos) % 68;
                let tokensOnSquare = 0;
                let barrierFound = false;
                
                const colorCounts = {};
                for (const pid of this.playersList) {
                    for (const t of this.tokens[pid]) {
                        if (t.status === 'active' && t.pos < 68) {
                            const gPos = (t.pos + this.startPositions[t.color]) % 68;
                            if (gPos === checkGlobal) {
                                colorCounts[t.color] = (colorCounts[t.color] || 0) + 1;
                                tokensOnSquare++;
                            }
                        }
                    }
                }
                
                for (const c in colorCounts) {
                    if (colorCounts[c] >= 2) barrierFound = true;
                }
                
                if (barrierFound) return false; // Bloqueo real
                if (i === spaces && tokensOnSquare >= 2) return false;
            }
        }
        return true;
    }

    moveToken(playerId, tokenId) {
        if (this.playersList[this.turnIndex] !== playerId || this.diceRoll.length === 0) return false;
        const color = this.tokens[playerId][0].color;
        const token = this.tokens[playerId].find(t => t.id === tokenId);
        if (!token) return false;

        let usedDieIndex = -1;

        if (token.status === 'home') {
            usedDieIndex = this.diceRoll.indexOf(5);
            if (usedDieIndex === -1 || !this.canSpawn(playerId)) return false;

            // Spawn
            token.status = 'active';
            token.pos = 0;
            this.diceRoll.splice(usedDieIndex, 1);
            this.checkCaptureAtLocation(playerId, this.startPositions[color], true);

        } else if (token.status === 'active') {
            for (let i = 0; i < this.diceRoll.length; i++) {
                if (this.isValidMove(playerId, token, this.diceRoll[i])) {
                    usedDieIndex = i;
                    break;
                }
            }

            if (usedDieIndex === -1) return false; // Not valid with any dice

            const spaces = this.diceRoll[usedDieIndex];
            this.diceRoll.splice(usedDieIndex, 1);

            token.pos += spaces;
            this.lastMovedTokenId = token.id;

            let pendingReward = 0;
            if (token.pos === 75) {
                token.status = 'goal';
                pendingReward = 10;
            } else if (token.pos < 68) {
                const globalPos = (token.pos + this.startPositions[color]) % 68;
                if (this.checkCaptureAtLocation(playerId, globalPos, false)) {
                    pendingReward = 20;
                }
            }

            if (pendingReward > 0) {
                this.diceRoll.unshift(pendingReward); // Add it to be consumed immediately
                this.awaitingReward = true;
            }
        } else {
            return false;
        }

        this.checkWin();
        if (this.status === 'finished') return true;

        this.autoSkipIfStuck(playerId);
        return true;
    }

    checkCaptureAtLocation(playerId, globalPos, isSpawn) {
        const safeZones = [0, 17, 34, 51, 12, 29, 46, 63];
        if (!isSpawn && safeZones.includes(globalPos)) return false;

        let captured = false;
        this.playersList.forEach(pid => {
            if (pid !== playerId) {
                this.tokens[pid].forEach(t => {
                    if (t.status === 'active' && t.pos < 68) {
                        const oppGlobal = (t.pos + this.startPositions[t.color]) % 68;
                        if (oppGlobal === globalPos) {
                            t.status = 'home';
                            t.pos = -1;
                            captured = true;
                        }
                    }
                });
            }
        });
        return captured;
    }

    nextTurn() {
        this.diceRoll = [];
        this.originalRoll = [];
        this.consecutiveDoubles = 0;
        this.awaitingReward = false;
        this.earnedExtraTurn = false;
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
            originalRoll: this.originalRoll,
            diceRoll: this.diceRoll,
            awaitingReward: this.awaitingReward,
            status: this.status,
            winner: this.winner,
            opponents,
            myColor: this.tokens[forPlayerId] ? this.tokens[forPlayerId][0].color : null
        };
    }
}

module.exports = ParchisGame;
