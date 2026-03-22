class UnoGame {
    constructor(playerIds) {
        this.playersList = playerIds; // array of up to 4 ids
        this.players = {};
        playerIds.forEach(id => this.players[id] = []);
        this.deck = [];
        this.discardPile = [];
        
        this.turnIndex = 0;
        this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
        
        this.currentColor = null;
        this.status = 'playing'; // playing, finished
        this.winner = null;
        
        this.unoCallStatus = {}; // track who has called UNO
        playerIds.forEach(id => this.unoCallStatus[id] = false);

        this.init();
    }

    init() {
        this.buildDeck();
        this.shuffleDeck();

        // Deal 7 cards each
        this.playersList.forEach(pid => {
            for (let i = 0; i < 7; i++) {
                this.players[pid].push(this.deck.pop());
            }
        });

        // Flip top card
        let topCard = this.deck.pop();
        // Top card cannot be a Wild Draw 4 to start, and ideally not a Wild
        while (topCard.type === 'wild' || topCard.type === 'wild_draw4') {
            this.deck.unshift(topCard);
            topCard = this.deck.pop();
        }
        
        this.discardPile.push(topCard);
        this.currentColor = topCard.color;

        // Apply starting card effects if any (skip, reverse, +2)
        if (topCard.type === 'reverse') {
            this.direction = -1;
            if (this.playersList.length === 2) {
                this.switchTurn(); // in 2 player, reverse acts as a skip
            }
        } else if (topCard.type === 'skip') {
            this.switchTurn();
        } else if (topCard.type === 'draw2') {
            // First player has to draw 2 and gets skipped
            this.drawCards(this.playersList[this.turnIndex], 2);
            this.switchTurn();
        }
    }

    buildDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        for (const color of colors) {
            // 0 card
            this.deck.push({ color, type: 'number', value: 0 });
            // 1-9, Draw 2, Skip, Reverse (x2 each)
            for (let i = 1; i <= 9; i++) {
                this.deck.push({ color, type: 'number', value: i });
                this.deck.push({ color, type: 'number', value: i });
            }
            for (let i = 0; i < 2; i++) {
                this.deck.push({ color, type: 'draw2', value: null });
                this.deck.push({ color, type: 'skip', value: null });
                this.deck.push({ color, type: 'reverse', value: null });
            }
        }
        // 4 Wild, 4 Wild Draw 4
        for (let i = 0; i < 4; i++) {
            this.deck.push({ color: 'wild', type: 'wild', value: null });
            this.deck.push({ color: 'wild', type: 'wild_draw4', value: null });
        }
    }

    shuffleDeck() {
        this.deck.sort(() => Math.random() - 0.5);
    }

    getCurrentTurnPlayer() {
        return this.playersList[this.turnIndex];
    }

    switchTurn() {
        let nextIndex = this.turnIndex + this.direction;
        if (nextIndex >= this.playersList.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = this.playersList.length - 1;
        this.turnIndex = nextIndex;
    }

    drawCards(playerId, amount) {
        for (let i = 0; i < amount; i++) {
            if (this.deck.length === 0) {
                // Return discard pile to deck (keep top card)
                const topCard = this.discardPile.pop();
                this.deck = this.discardPile;
                this.discardPile = [topCard];
                this.shuffleDeck();
            }
            if (this.deck.length > 0) {
                this.players[playerId].push(this.deck.pop());
            }
        }
    }

    isValidMove(card) {
        const topCard = this.discardPile[this.discardPile.length - 1];
        if (card.color === 'wild') return true;
        if (card.color === this.currentColor) return true;
        if (card.type === topCard.type && card.value === topCard.value) return true;
        return false;
    }

    playCard(playerId, cardIndex, chosenColor = null) {
        if (this.getCurrentTurnPlayer() !== playerId || this.status !== 'playing') return false;
        
        const hand = this.players[playerId];
        if (cardIndex < 0 || cardIndex >= hand.length) return false;
        
        const card = hand[cardIndex];

        if (!this.isValidMove(card)) return false;

        // Reset UNO call status if they had it but drew/played so they aren't safe anymore
        // Actually, if they play their second to last card, they MUST call UNO.
        if (hand.length === 2 && !this.unoCallStatus[playerId]) {
            // Penalty for not calling UNO! Draw 2!
            this.drawCards(playerId, 2);
        }

        // Remove from hand
        hand.splice(cardIndex, 1);
        this.discardPile.push(card);

        // Update current color
        if (card.color === 'wild') {
            this.currentColor = chosenColor || 'red'; // default to red if missed
        } else {
            this.currentColor = card.color;
        }

        // Check Winner
        if (hand.length === 0) {
            this.status = 'finished';
            this.winner = playerId;
            return true;
        }

        // Apply Card Effects
        if (card.type === 'reverse') {
            this.direction *= -1;
            if (this.playersList.length === 2) {
                this.switchTurn(); // Reverse is a Skip in 2-player
            }
            this.switchTurn(); // Normal turn progression
        } else if (card.type === 'skip') {
            this.switchTurn();
            this.switchTurn(); // Skip 1 person
        } else if (card.type === 'draw2') {
            this.switchTurn();
            this.drawCards(this.getCurrentTurnPlayer(), 2);
            this.switchTurn(); // Skip them
        } else if (card.type === 'wild_draw4') {
            this.switchTurn();
            this.drawCards(this.getCurrentTurnPlayer(), 4);
            this.switchTurn(); // Skip them
        } else {
            // Normal card Move
            this.switchTurn();
        }

        return true;
    }

    drawTurn(playerId) {
        if (this.getCurrentTurnPlayer() !== playerId || this.status !== 'playing') return false;
        
        // Remove Uno safety if they drew a card
        this.unoCallStatus[playerId] = false;
        
        let validFound = false;
        let limit = 50; // Prevent infinite loop in edge case where deck empty and no valid moves exist
        
        while (!validFound && limit > 0) {
            const initialLen = this.players[playerId].length;
            this.drawCards(playerId, 1);
            if (this.players[playerId].length === initialLen) break; // Cannot draw more cards
            
            const newCard = this.players[playerId][this.players[playerId].length - 1];
            if (this.isValidMove(newCard)) {
                validFound = true;
            }
            limit--;
        }
        
        // Se queda en el turno de este jugador para que juegue obligatoriamente la carta válida que sacó.
        return true;
    }

    callUno(playerId) {
        if (this.players[playerId] && this.players[playerId].length <= 2) {
            this.unoCallStatus[playerId] = true;
            return true;
        }
        return false;
    }

    getState(forPlayerId) {
        const opponents = [];
        this.playersList.forEach(pid => {
            if (pid !== forPlayerId) {
                opponents.push({
                    id: pid,
                    cardCount: this.players[pid] ? this.players[pid].length : 0
                });
            }
        });

        const topCard = this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;

        return {
            myHand: this.players[forPlayerId] || [],
            opponents, // array of {id, cardCount, username, avatarUrl} hydrated in server.js
            topCard,
            currentColor: this.currentColor,
            deckCount: this.deck.length,
            turn: this.getCurrentTurnPlayer(),
            direction: this.direction,
            status: this.status,
            winner: this.winner
        };
    }
}

module.exports = UnoGame;
