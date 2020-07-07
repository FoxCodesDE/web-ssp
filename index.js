let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);
let crypto = require('crypto');

let currentgames = {};
let users = {};

let game_data = require('./html/data.json');

let createGame = (user) => {
    let gamekey = `g.${crypto.randomBytes(5).toString('hex')}`;

    currentgames[gamekey] = {
        gamekey,
        owner: user,
        guest: '',
        state: {
            score: { owner: 0, guest: 0 },
            currentPlay: { owner: '', guest: '' },
            playHistory: [],
        },
    };

    return gamekey;
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/html/game.html');
});

app.get('/game.js', (req, res) => {
    res.sendFile(__dirname + '/html/game.js');
});

app.get('/data', (req, res) => {
    res.sendFile(__dirname + '/html/data.json');
});

app.get('/meta', (req, res) => {
    let userrs = {};

    for (let k in users) {
        if (users[k] !== undefined) {
            userrs[k] = Object.assign({}, users[k], { socket: null });
        }
    }

    res.send({ currentgames, users: userrs });
});

io.on('connection', (socket) => {
    let uid = `u.${crypto.randomBytes(5).toString('hex')}`;

    socket.emit('uruser', uid);
    users[uid] = {
        nick: uid,
        socket: socket,
    };

    console.log('a user connected', uid);

    socket.on('disconnect', () => {
        console.log('user disconnected', uid);
        users[uid] = undefined;
        for (let i in currentgames) {
            if (currentgames[i] !== undefined && currentgames[i].owner === uid) {
                currentgames[i] = undefined;
            }
        }
    });

    socket.on('debug', (...d) => {
        console.log('debug', ...d);
    });

    socket.on('creategame', () => {
        if (!(users[uid].currentgame == undefined || users[uid].currentgame == '')) {
            // game clearen

            currentgames[users[uid].currentgame] = undefined;
        }

        let gamekey = createGame(uid);

        users[uid].currentgame = gamekey;
        users[uid].currentgamerole = 'owner';

        console.log('create game', gamekey);

        socket.emit('gamecreated', gamekey);
    });

    socket.on('savenick', (nick) => {
        console.log('nick change:', uid, nick);
        users[uid].nick = nick;
    });

    socket.on('joingame', (gameid) => {
        console.log('game join', gameid);
        if (currentgames[gameid] === undefined || currentgames[gameid].guest !== '') {
            // gamejoin zurückweisen / ungültige gameid
            console.log(`gameid ${gameid} nicht bekannt`);
        } else {
            currentgames[gameid].guest = uid;

            users[uid].currentgame = gameid;
            users[uid].currentgamerole = 'guest';

            socket.emit('gamejoined', gameid, users[currentgames[gameid].owner].nick);
            users[currentgames[gameid].owner].socket.emit('guestjoined', users[uid].nick);
        }
    });

    socket.on('gameinput', (input) => {
        let gameid = users[uid].currentgame;

        currentgames[gameid].state.currentPlay[users[uid].currentgamerole] = input;

        console.log(uid, input);

        let input_owner = currentgames[gameid].state.currentPlay.owner;
        let input_guest = currentgames[gameid].state.currentPlay.guest;
        if (input_owner !== '' && input_guest !== '') {
            // Spiel startet
            console.log('sieger berechnen');
            let result = '';
            if (game_data[input_owner].effective[input_guest] !== undefined) {
                // owner hat gewonnen
                console.log('owner hat gewonnen');
                currentgames[gameid].state.score.owner += 1;
                result = currentgames[gameid].owner;
            } else if (game_data[input_guest].effective[input_owner] !== undefined) {
                // guest hat gewonnen
                console.log('guest hat gewonnen');
                currentgames[gameid].state.score.guest += 1;
                result = currentgames[gameid].guest;
            } else {
                // unentschieden
                console.log('unentschieden');
            }

            users[currentgames[gameid].owner].socket.emit(
                'roundend',
                users[currentgames[gameid].guest].nick,
                result,
                input_owner,
                input_guest,
                currentgames[gameid].state.score.owner,
                currentgames[gameid].state.score.guest
            );
            users[currentgames[gameid].guest].socket.emit(
                'roundend',
                users[currentgames[gameid].owner].nick,
                result,
                input_guest,
                input_owner,
                currentgames[gameid].state.score.guest,
                currentgames[gameid].state.score.owner
            );

            // spielbereich wieder vorbereiten
            currentgames[gameid].state.playHistory.push(currentgames[gameid].state.currentPlay);
            currentgames[gameid].state.currentPlay = { owner: '', guest: '' };
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
