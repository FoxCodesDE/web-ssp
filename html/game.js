let socket = io();
let game_data = {};
let user_id = '';

socket.on('gamecreated', function (gameid) {
    console.log(gameid);

    let copydisshit = confirm(`
    Du hast ein Spiel erstellt.
    Teile deinem Gegner diese Spiel-ID mit:
    
    ${gameid}
    
    Soll Sie in deine Zwischenablage kopiert werden?`);
    if (copydisshit) {
        document.getElementById('copyinput').style = '';
        document.getElementById('copyinput').value = gameid;
        document.getElementById('copyinput').select();
        document.execCommand('copy');
        document.getElementById('copyinput').style = 'display: none';
    }
});

socket.on('test', console.log);

socket.on('uruser', (usr) => {
    $('#nickname').val(usr);
    user_id = usr;
});

socket.on('roundend', (opponick, result, input, oppoinput, score, opposcore) => {
    console.log(JSON.stringify({ opponick, result, input, oppoinput, score, opposcore }));

    $('#result_u_display').text(game_data[input].display);
    $('#result_u_name').text(game_data[input].name);
    $('#result_oppo_display').text(game_data[oppoinput].display);
    $('#result_oppo_name').text(game_data[oppoinput].name);

    $('#result_score').text(score);
    $('#result_oppo_score').text(opposcore);

    if (result === '') {
        // unentschieden, beide anzeigen
        $('#result_display').text(`${game_data[input].display}${game_data[oppoinput].display}`);
        $('#result_text').text(
            `${game_data[input].name} gegen ${game_data[oppoinput].name}: unentschieden`
        );
    } else if (result === user_id) {
        // selbst gewonnen
        $('#result_display').text(`${game_data[input].display}`);
        $('#result_text').text(
            `${game_data[input].name} ${
                Array.isArray(game_data[input].effective[oppoinput])
                    ? `${game_data[input].effective[oppoinput][0]} ${game_data[oppoinput].name} ${game_data[input].effective[oppoinput][1]}`
                    : `${game_data[input].effective[oppoinput]} ${game_data[oppoinput].name}`
            } `
        );
    } else {
        // gegner gewonnen
        $('#result_display').text(`${game_data[oppoinput].display}`);
        $('#result_text').text(
            `${game_data[oppoinput].name} ${
                Array.isArray(game_data[oppoinput].effective[input])
                    ? `${game_data[oppoinput].effective[input][0]} ${game_data[input].name} ${game_data[oppoinput].effective[input][1]}`
                    : `${game_data[oppoinput].effective[input]} ${game_data[input].name}`
            } `
        );
    }
});

socket.on('guestjoined', (username) => {
    alert(`
    Jemand ist deinem Spiel beigetreten:
    
    ${username}.
    
    Ihr könnt jetzt anfangen zu Spielen!`);
});

socket.on('gamejoined', (gameid, ownername) => {
    alert(`
    Du bist einem Spiel beigetreten:
    
    ${gameid} von ${ownername}.
    
    Ihr könnt jetzt anfangen zu Spielen!`);
});

$('#btn-savenick').click(() => {
    socket.emit('savenick', $('#nickname').val());
});

$('#btn-newgame').click(() => {
    console.log('ban');
    socket.emit('creategame');
});

$('#btn-joingame-join').click(() => {
    socket.emit('joingame', $('#joingame-id').val());
});

const parsedUrl = new URL(window.location.href);
if (parsedUrl.searchParams.get('id') !== null) {
    socket.emit('joingame', parsedUrl.searchParams.get('id'));
}

function gameinput(input) {
    socket.emit('gameinput', input);
}

fetch('/data')
    .then((data) => data.json())
    .then((data) => {
        game_data = data;
        //lost
        for (let i in data) {
            let k = data[i];

            k.el = `<div id="btn_game_${i}" onclick="gameinput('${i}');" class="col btn btn-primary" style="margin: 0 10px;">
                            <h2 style="text-align: center;">${k.display}</h2>
                            <h5 style="text-align: center;">${k.name}</h5>
                        </div>`;

            $(`#btn_game_${i}`).click(() => {
                socket.emit('gameinput', i);
            });

            $('#gamebuttons').append(k.el);
        }
    });
