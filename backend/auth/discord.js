const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // Needs to be installed if < Node 18, but Node 18+ has native fetch. Let's assume native fetch.
const { getUser, getLeaderboard } = require('../database/db');

// In production, these should be from process.env
// The user MUST fill these in .env to use real OAuth
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/discord', (req, res) => {
    if (!CLIENT_ID) {
        return res.redirect(`${FRONTEND_URL}/?error=missing_discord_credentials`);
    }
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(url);
});

router.get('/discord/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect(`${FRONTEND_URL}?error=no_code`);

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                scope: 'identify',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            console.error('Discord Auth Error:', tokenData);
            return res.redirect(`${FRONTEND_URL}?error=discord_auth_failed`);
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });

        const discordUser = await userResponse.json();

        // Register / Update User in Database
        const avatarUrl = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
        
        // Let's modify DB functions to accept username and avatarUrl
        const db = require('../database/db');
        const user = db.getOrCreateDiscordUser(discordUser.id, discordUser.username, avatarUrl);

        // Simple token system: just send their ID encoded or raw for MVP. (In prod, use JWT)
        // We will just redirect with their ID as token so Frontend can auto-fetch `/api/me?token=...`
        const fakeToken = Buffer.from(user.id).toString('base64');
        
        res.redirect(`${FRONTEND_URL}?token=${fakeToken}`);

    } catch (err) {
        console.error(err);
        res.redirect(`${FRONTEND_URL}?error=internal_auth_error`);
    }
});

// A route for frontend to get their profile securely using the token
router.get('/me', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).json({error: 'no token'});
    try {
        const id = Buffer.from(token, 'base64').toString('ascii');
        const user = getUser(id);
        res.json(user);
    } catch(e) {
        res.status(401).json({error: 'invalid credentials'});
    }
});

module.exports = router;
