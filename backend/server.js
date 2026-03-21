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
            socket.emit('game_state', room.instance.getState(myId));
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
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketsInRoom) {
        for (const socketId of socketsInRoom) {
            const userId = onlineUsers[socketId];
            io.to(socketId).emit('game_state', room.instance.getState(userId));
        }
    }
}

function checkGameEnd(roomId, room) {
    const game = room.instance;
    if (game.status !== 'playing' && game.winner) {
        if (game.winner !== 'draw') {
            const loser = game.winner === game.p1 ? game.p2 : game.p1;
            // TicTacToe gives less points to keep Dominoes as main game, or same points. Let's do same points.
            updatePoints(game.winner, 50, true); 
            updatePoints(loser, -15, false); 
        }
        // Emit final state and game over event
        io.to(roomId).emit('game_over', { winner: game.winner });
        delete rooms[roomId];
    }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
