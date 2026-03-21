const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, 'users.json');

// Initialize DB file
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({}));
}

function getUsers() {
    const data = fs.readFileSync(usersFile);
    return JSON.parse(data);
}

function saveUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getOrCreateDiscordUser(id, username, avatarUrl) {
    const users = getUsers();
    if (!users[id]) {
        users[id] = { id, username, avatarUrl, points: 1000, wins: 0, losses: 0 };
    } else {
        users[id].username = username;
        users[id].avatarUrl = avatarUrl;
    }
    saveUsers(users);
    return users[id];
}

function getUser(id) {
    const users = getUsers();
    return users[id] || null;
}

function updatePoints(id, pointDelta, isWin) {
    const users = getUsers();
    if (users[id]) {
        users[id].points += pointDelta;
        if (isWin) users[id].wins += 1;
        else users[id].losses += 1;
        saveUsers(users);
    }
}

function getLeaderboard() {
    const users = getUsers();
    return Object.values(users).sort((a, b) => b.points - a.points).slice(0, 10);
}

module.exports = { getUser, getOrCreateDiscordUser, updatePoints, getLeaderboard };
