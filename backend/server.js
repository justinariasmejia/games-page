require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { getUser, updatePoints, getLeaderboard } = require('./database/db');
const DominoesGame = require('./game/dominoes');
const TicTacToeGame = require('./game/tictactoe');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Auth Router
const discordAuth = require('./auth/discord');
app.use('/auth', discordAuth);

app.get('/api/leaderboard', (req, res) => {
    res.json(getLeaderboard());
});

// Real-time Socket.io logic
const rooms = {}; // roomId -> DominoesGame instance
const onlineUsers = {}; // socket.id -> userId
const userSockets = {}; // userId -> socket.id

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('login', (userId) => {
        onlineUsers[socket.id] = userId;
        userSockets[userId] = socket.id;
        broadcastOnlineUsers();
    });

    socket.on('update_profile', (config) => {
        const myId = onlineUsers[socket.id];
        if (myId) {
            const { updateProfileConfig } = require('./database/db');
            updateProfileConfig(myId, config);
            broadcastOnlineUsers(); // Refresh names/colors for everyone
        }
    });

    socket.on('challenge', ({ opponentId, gameType = 'dominoes' }) => {
        const myId = onlineUsers[socket.id];
        const oppSocket = userSockets[opponentId];
        if (oppSocket) {
            io.to(oppSocket).emit('challenge_received', { from: myId, gameType });
        }
    });

    socket.on('accept_challenge', ({ challengerId, gameType }) => {
        const myId = onlineUsers[socket.id];
        const roomId = `${gameType}_${challengerId}_${myId}_${Date.now()}`;
        
        if (gameType === 'tictactoe') {
            rooms[roomId] = { instance: new TicTacToeGame(challengerId, myId), type: 'tictactoe' };
        } else {
            rooms[roomId] = { instance: new DominoesGame([challengerId, myId]), type: 'dominoes' };
        }

        // Tell both to join the room
        socket.emit('start_game', { roomId, gameType });
        const challengerSocket = userSockets[challengerId];
        if (challengerSocket) {
            io.to(challengerSocket).emit('start_game', { roomId, gameType });
        }
    });

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        const room = rooms[roomId];
        if (room) {
            const myId = onlineUsers[socket.id];
            const state = room.instance.getState(myId);
            
            // Hydrate opponents with usernames and avatars
            const { getUser } = require('./database/db');
            if (state.opponents) {
                state.opponents = state.opponents.map(opp => {
                    const u = getUser(opp.id);
                    return { ...opp, username: u?.username, avatarUrl: u?.avatarUrl, profileConfig: u?.profileConfig };
                });
            }
            
            socket.emit('game_state', state);
        }
    });

    socket.on('play_tile', ({ roomId, tileIndex, side }) => {
        const room = rooms[roomId];
        const myId = onlineUsers[socket.id];
        if (room && room.type === 'dominoes' && room.instance.playTile(myId, tileIndex, side)) {
            broadcastGameState(roomId, room);
            checkGameEnd(roomId, room);
        }
    });

    socket.on('play_ttt_move', ({ roomId, index }) => {
        const room = rooms[roomId];
        const myId = onlineUsers[socket.id];
        if (room && room.type === 'tictactoe' && room.instance.playMove(myId, index)) {
            broadcastGameState(roomId, room);
            checkGameEnd(roomId, room);
        }
    });

    socket.on('draw_tile', (roomId) => {
        const room = rooms[roomId];
        const myId = onlineUsers[socket.id];
        if (room && room.type === 'dominoes' && room.instance.drawTile(myId)) {
            broadcastGameState(roomId, room);
        }
    });

    socket.on('pass_turn', (roomId) => {
        const room = rooms[roomId];
        const myId = onlineUsers[socket.id];
        if (room && room.type === 'dominoes' && room.instance.passTurn(myId)) {
            broadcastGameState(roomId, room);
            checkGameEnd(roomId, room);
        }
    });

    socket.on('disconnect', () => {
        const userId = onlineUsers[socket.id];
        
        // Handle Auto-Surrender if disconnecting during an active game
        if (userId) {
            for (const [roomId, room] of Object.entries(rooms)) {
                if (room.instance.status === 'playing') {
                    // Check if this user is in the game
                    let isPlayer = false;
                    let opponents = [];
                    
                    if (room.type === 'dominoes' && room.instance.playersList.includes(userId)) {
                        isPlayer = true;
                        opponents = room.instance.playersList.filter(id => id !== userId);
                    } else if (room.type === 'tictactoe' && (room.instance.p1 === userId || room.instance.p2 === userId)) {
                        isPlayer = true;
                        opponents = [room.instance.p1, room.instance.p2].filter(id => id !== userId);
                    }

                    // If it's a 1v1 match and they disconnect, they surrender!
                    if (isPlayer && opponents.length === 1) {
                        room.instance.status = 'finished';
                        room.instance.winner = opponents[0]; // the other guy wins!
                        const { updatePoints, getUser } = require('./database/db');
                        updatePoints(room.instance.winner, 50, true);
                        updatePoints(userId, -20, false);
                        broadcastGameState(roomId, room);
                        io.to(roomId).emit('chat_message', { system: true, text: `El oponente se desconectó. ¡Victoria automática para ${getUser(opponents[0])?.username || 'el jugador restante'}!` });
                        
                        // Hydrate React instantly for the winner
                        const s_winner = userSockets[room.instance.winner];
                        if (s_winner) io.to(s_winner).emit('user_updated', getUser(room.instance.winner));
                    }
                }
            }
        }

        delete onlineUsers[socket.id];
        delete userSockets[userId];
        broadcastOnlineUsers();
        console.log('User disconnected:', socket.id);
    });
});

function broadcastOnlineUsers() {
    const userList = Object.keys(userSockets).map(id => getUser(id)).filter(u => u != null);
    io.emit('online_users', userList);
}

function broadcastGameState(roomId, room) {
    const { getUser } = require('./database/db');
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketsInRoom) {
        for (const sid of socketsInRoom) {
            const playerId = onlineUsers[sid];
            if (playerId) {
                const state = room.instance.getState(playerId);
                
                // Hydrate opponents with usernames and avatars
                if (state.opponents) {
                    state.opponents = state.opponents.map(opp => {
                        const u = getUser(opp.id);
                        return { ...opp, username: u?.username, avatarUrl: u?.avatarUrl, profileConfig: u?.profileConfig };
                    });
                } else if (state.opponentId) {
                    // For TicTacToe single opponent
                    const u = getUser(state.opponentId);
                    state.opponentProfile = { username: u?.username, avatarUrl: u?.avatarUrl, profileConfig: u?.profileConfig };
                }

                io.to(sid).emit('game_state', state);
            }
        }
    }
}
function checkGameEnd(roomId, room) {
    const game = room.instance;
    if (game.status !== 'playing' && game.winner) {
        const { updatePoints, getUser } = require('./database/db');
        if (game.winner !== 'draw') {
            if (room.type === 'tictactoe') {
                const loser = game.winner === game.p1 ? game.p2 : game.p1;
                updatePoints(game.winner, 50, true); 
                updatePoints(loser, -15, false); 
            } else if (room.type === 'dominoes') {
                const losers = game.playersList.filter(id => id !== game.winner);
                updatePoints(game.winner, 50, true); 
                losers.forEach(loserId => updatePoints(loserId, -15, false));
            }
        }
        
        broadcastOnlineUsers(); // Push updated leaderboards to lobby
        
        // Push the new user state to the players directly so React updates instantly
        const players = room.type === 'dominoes' ? game.playersList : [game.p1, game.p2];
        players.forEach(pid => {
            const sid = userSockets[pid];
            if (sid) io.to(sid).emit('user_updated', getUser(pid));
        });

        // Emit final state and game over event
        io.to(roomId).emit('game_over', { winner: game.winner });
        delete rooms[roomId];
    }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
