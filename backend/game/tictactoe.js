class TicTacToeGame {
    constructor(player1Id, player2Id) {
        this.p1 = player1Id; // Plays 'X'
        this.p2 = player2Id; // Plays 'O'
        this.board = Array(9).fill(null);
        this.turn = this.p1;
        this.status = 'playing'; // playing, finished
        this.winner = null;
    }

    playMove(playerId, index) {
        if (this.status !== 'playing' || this.turn !== playerId || index < 0 || index >= 9 || this.board[index]) {
            return false;
        }

        this.board[index] = playerId === this.p1 ? 'X' : 'O';
        
        if (this.checkWin()) {
            this.status = 'finished';
            this.winner = playerId;
        } else if (this.board.every(cell => cell !== null)) {
            this.status = 'finished';
            this.winner = 'draw';
        } else {
            this.turn = this.turn === this.p1 ? this.p2 : this.p1;
        }
        
        return true;
    }

    checkWin() {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6] // diagonals
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return true;
            }
        }
        return false;
    }

    getState(forPlayerId) {
        return {
            board: this.board,
            turn: this.turn,
            status: this.status,
            winner: this.winner,
            mySymbol: forPlayerId === this.p1 ? 'X' : 'O',
            opponentId: forPlayerId === this.p1 ? this.p2 : this.p1
        };
    }
}

module.exports = TicTacToeGame;
