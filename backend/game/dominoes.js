class DominoesGame {
    constructor(playerIds) {
        this.playersList = playerIds; // array of up to 4 ids
        this.players = {};
        playerIds.forEach(id => this.players[id] = []);
        this.boneyard = [];
        this.board = []; // Array of tiles: [{left, right}]
        this.turnIndex = 0;
        this.status = 'playing'; // playing, finished, blocked
        this.winner = null;
        this.consecutivePasses = 0; // to detect blocks effectively
        
        this.init();
    }

    init() {
        // Create 28 tiles (double-six)
        let tiles = [];
        for (let i = 0; i <= 6; i++) {
            for (let j = i; j <= 6; j++) {
                tiles.push([i, j]);
            }
        }
        // Shuffle
        tiles.sort(() => Math.random() - 0.5);

        // Deal 7 each
        this.playersList.forEach(pid => {
            this.players[pid] = tiles.splice(0, 7);
        });
        this.boneyard = tiles;

        // Determine who goes first (highest double)
        let firstPlay = this.findHighestDouble();
        const startingPlayer = firstPlay ? firstPlay.player : this.playersList[0];
        this.turnIndex = this.playersList.indexOf(startingPlayer);
    }

    findHighestDouble() {
        let maxDouble = -1;
        let playerWithMax = null;
        for (const [pid, hand] of Object.entries(this.players)) {
            for (const tile of hand) {
                if (tile[0] === tile[1] && tile[0] > maxDouble) {
                    maxDouble = tile[0];
                    playerWithMax = pid;
                }
            }
        }
        return playerWithMax ? { player: playerWithMax, double: maxDouble } : null;
    }

    getCurrentTurnPlayer() {
        return this.playersList[this.turnIndex];
    }

    getPlayableEnds() {
        if (this.board.length === 0) return { left: 'any', right: 'any' };
        return {
            left: this.board[0][0],
            right: this.board[this.board.length - 1][1]
        };
    }

    isValidMove(tile, side) {
        if (this.board.length === 0) return true;
        const ends = this.getPlayableEnds();
        if (side === 'left') return tile[0] === ends.left || tile[1] === ends.left;
        if (side === 'right') return tile[0] === ends.right || tile[1] === ends.right;
        return false;
    }

    playTile(playerId, tileIndex, side) {
        if (this.getCurrentTurnPlayer() !== playerId || this.status !== 'playing') return false;
        
        const hand = this.players[playerId];
        const tile = hand[tileIndex];

        if (!this.isValidMove(tile, side)) return false;

        // Remove from hand
        hand.splice(tileIndex, 1);
        this.consecutivePasses = 0; // Reset passes

        // Place on board
        if (this.board.length === 0) {
            this.board.push(tile);
        } else {
            const ends = this.getPlayableEnds();
            if (side === 'left') {
                if (tile[1] === ends.left) this.board.unshift(tile);
                else this.board.unshift([tile[1], tile[0]]); // flip
            } else {
                if (tile[0] === ends.right) this.board.push(tile);
                else this.board.push([tile[1], tile[0]]); // flip
            }
        }

        this.checkWinCondition();
        if (this.status === 'playing') {
            this.switchTurn();
        }
        return true;
    }

    drawTile(playerId) {
        if (this.getCurrentTurnPlayer() !== playerId || this.status !== 'playing') return false;
        if (this.boneyard.length > 0) {
            const tile = this.boneyard.pop();
            this.players[playerId].push(tile);
            return true;
        }
        return false;
    }

    passTurn(playerId) {
        if (this.getCurrentTurnPlayer() !== playerId || this.status !== 'playing' || this.boneyard.length > 0) return false;
        
        // Ensure they actually cannot play
        const ends = this.getPlayableEnds();
        const canPlay = this.players[playerId].some(t => t[0] === ends.left || t[1] === ends.left || t[0] === ends.right || t[1] === ends.right);
        if (canPlay) return false; // Must play if able

        this.consecutivePasses++;
        this.switchTurn();
        this.checkBlocked();
        return true;
    }

    switchTurn() {
        this.turnIndex = (this.turnIndex + 1) % this.playersList.length;
    }

    checkWinCondition() {
        for (const pid of this.playersList) {
            if (this.players[pid].length === 0) {
                this.status = 'finished';
                this.winner = pid;
                return;
            }
        }
    }

    checkBlocked() {
        // If everyone passes consecutively, the game is blocked
        if (this.consecutivePasses >= this.playersList.length) {
            this.status = 'blocked';
            // Count pips to find winner with lowest sum
            let minSum = Infinity;
            let currentWinner = null;
            let isTie = false;

            for (const pid of this.playersList) {
                const sum = this.players[pid].reduce((s, t) => s + t[0] + t[1], 0);
                if (sum < minSum) {
                    minSum = sum;
                    currentWinner = pid;
                    isTie = false;
                } else if (sum === minSum) {
                    isTie = true;
                }
            }
            
            this.winner = isTie ? 'draw' : currentWinner;
        }
    }

    getState(forPlayerId) {
        const opponents = [];
        this.playersList.forEach(pid => {
            if (pid !== forPlayerId) {
                opponents.push({
                    id: pid,
                    tileCount: this.players[pid] ? this.players[pid].length : 0
                });
            }
        });

        return {
            myHand: this.players[forPlayerId] || [],
            opponents, // array of {id, tileCount}
            board: this.board,
            boneyardCount: this.boneyard.length,
            turn: this.getCurrentTurnPlayer(),
            status: this.status,
            winner: this.winner
        };
    }
}

module.exports = DominoesGame;
