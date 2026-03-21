const { Chess } = require('chess.js');

class ChessGame {
    constructor(playerIds) {
        // Player 1 gets white randomly (or just static for now)
        // Let's randomize white and black
        if (Math.random() > 0.5) {
            this.p1 = playerIds[0]; // white
            this.p2 = playerIds[1]; // black
        } else {
            this.p1 = playerIds[1]; // white
            this.p2 = playerIds[0]; // black
        }
        
        this.playersList = [this.p1, this.p2];
        this.chess = new Chess();
        this.status = 'playing'; 
        this.winner = null; 
    }

    playMove(playerId, sourceSquare, targetSquare, promotion = 'q') {
        if (this.status !== 'playing') return false;
        const colorTurn = this.chess.turn() === 'w' ? this.p1 : this.p2;
        
        if (playerId !== colorTurn) return false;

        try {
            const move = this.chess.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: promotion
            });

            if (!move) return false;

            if (this.chess.isCheckmate()) {
                this.status = 'checkmate';
                this.winner = playerId;
            } else if (this.chess.isDraw() || this.chess.isStalemate() || this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial()) {
                this.status = 'draw';
                this.winner = 'draw';
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    getState(forPlayerId) {
        const opponents = this.playersList.filter(id => id !== forPlayerId).map(id => ({ id }));
        return {
            fen: this.chess.fen(),
            turn: this.chess.turn() === 'w' ? this.p1 : this.p2,
            orientation: forPlayerId === this.p1 ? 'white' : 'black',
            status: this.status,
            winner: this.winner,
            opponents,
            isCheck: this.chess.inCheck()
        };
    }
}

module.exports = ChessGame;
