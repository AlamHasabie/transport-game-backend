var constants = require("../constants.json");
var config = require("../config.json");
var room_module = require("./room_module");
var emitter;



function init(emitter_in){

    emitter = emitter_in;
    room_module.init(emitter);

}

function handle(room,token){

    switch (room.state) {
        case constants.validState.prepare:

            delete room.player_status[token];
            gameState[room].player_ready.delete(token);
            gameState[room].roll_wait.delete(token);
            gameState[room].player--;

            // If player ready becomes zero, then kickstart the game earlier.
            if(room.player_ready.size==0&&room.player>=config.minimal_player){

                // Delete player_ready element
                delete gameState[room].player_ready;

                // Set to game ready
                gameState[room].state = validState.ready;
                emitter.sendstate(room,constants.validContext.player_leave);
                emitter.sendstate(room,validContext.game_ready); 
            }

            break;

        case validState.ready:

            room.first_roll = room.first_roll
                .filter(function(item){return item != token});

            room.roll_wait.delete(token);
            delete room.player_status[token];

            room.player--;            
            emitter.sendstate(room,constants.validContext.player_leave);

            // Start game
            if(room.roll_wait.size == 0){
                room = room_module.startGame(room);
            }
            break;

        case validState.rolling:

            deleteplayerduringgame(room,token);

            if(isPlaying){

                room = adjustPlayerTurn(room,token);

            } else {

            }

            break;

        case validState.answer_wait:
            delete gameState[room].offered_answer;
            delete gameState[room].timeout_id;

            deleteplayerduringgame(room,token);

            if(thistokenplaying){
                gameState[room].state = validState.rolling;
                sendcurrentstatedata(room,validContext.turn);
            }

        case validState.treasure_wait:
            delete gameState[room].treasure;
            delete gameState[room].timeout_id;
            
            deleteplayerduringgame(room,token);

            if(thistokenplaying){
                gameState[room].state = validState.rolling;
                sendcurrentstatedata(room,validContext.turn);
            }

        case validState.activation:

            deleteplayerduringgame(room,token);

            if(thistokenplaying){
                gameState[room].state = validState.rolling;
                sendcurrentstatedata(room,validContext.turn);
            }

            break;
    
        default:

            break;

    }

}

function adjustPlayerTurn(room,token){

    let playing_token = room.player_order[room.current_player];
    let next_tok;
    if(token == playing_token){
        room = fetchNextPlayer(room);
    } 

    next_tok = room.player_order[room.current_player];
    room.player_order = room.player_order
        .filter(function(item){return item!=token});

    let index = room.player_order.indexOf(next_tok);
    room.current_player = index;

    return room;

}

function fetchNextPlayer(room){
    let valid_player = false;
    let next_player = room.current_player;
    while(!valid_player){
        next_player = (next_player+1)%room.player_order.length;
        if(room.skipped.has(room.player_order[next_player])){
            room.skipped.delete(room.player_order[next_player]);
        } else {
            valid_player = true;
        }
    }
    room.current_player = next_player;

    return room;
}


function deleteplayerduringgame(room,token){

    gameState[room] = question_module.releaseQuestions(gameState[room],token);
    delete gameState[room].player_status[token];
    deletefromplayerorder(room,token);
    gameState[room].player--;

    emitplayerleaves(room,token);

}


module.exports = {
    init : init,
    handle : handle
}