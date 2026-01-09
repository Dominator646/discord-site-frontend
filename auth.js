const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const supabase = createClient('ТВОЙ_SUPABASE_URL', 'ТВОЙ_ANON_KEY');

const CLIENT_ID = 'ТВОЙ_CLIENT_ID';
const CLIENT_SECRET = 'ТВОЙ_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3000/auth/callback';

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // 1. Обмениваем код на токен
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            scope: 'identify',
        }));

        const accessToken = tokenResponse.data.access_token;

        // 2. Получаем данные пользователя из Discord
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const discordUser = userResponse.data;

        // 3. Проверяем/Создаем пользователя в Supabase
        const { data, error } = await supabase
            .from('users')
            .upsert({ 
                id: discordUser.id, 
                username: discordUser.username, 
                avatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            }, { onConflict: 'id' })
            .select();

        // 4. Перебрасываем на основной сайт (Репозиторий №2)
        res.redirect(`https://твой-сайт.com/dashboard?user_id=${discordUser.id}`);

    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).send('Ошибка при входе через Discord');
    }
});

app.listen(3000);
