var constants = require("../constants.json");
var config = require("../config.json");
var room_module = require("./room_module");
var question_module = require("./question_module");
var emitter;



function init(emitter_in){

    emitter = emitter_in;
    room_module.init(emitter);
    question_module.init(emitter);

}

function handle(room,token){

    let timeoutId, isPlaying;

    switch (room.state) {
        case constants.validState.prepare:

            delete room.player_status[token];
            room.player_ready.delete(token);
            room.roll_wait.delete(token);
            room.player--;

            // If player ready becomes zero, then kickstart the game earlier.
            if(room.player_ready.size==0&&room.player>=config.minimal_player){

                // Delete player_ready element
                delete room.player_ready;

                // Set to game ready
                room.state = constant.validState.ready;
                emitter.sendstate(room,constants.validContext.player_leave);
                emitter.sendstate(room,constants.validContext.game_ready); 
            }

            break;

        case constants.validState.ready:

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
        case constants.validState.finished : 
            // TODO
            break;

        case constants.validState.activation :
        case constants.validState.treasure_wait :
        case constants.validState.rolling :


            
            if(room.player>1){
                isPlaying = (token==room.player_order[room.current_player]);
                room = deletePlayerStatus(room,token);
                room = adjustPlayerTurn(room,token);
                room.player--;

                timeoutId = room.timeout_id;
                room.timeout_id = null;

                emitter.sendstate(room,constants.validContext.player_leave);

                room.timeout_id = timeoutId;
    
                if(isPlaying){
                    room.state = constants.validState.current_player_leave;
                } 
            } else {
                room = deletePlayerStatus(room,token);
                room.state = constants.validState.current_player_leave;
                room.player_order = [];
                room.current_player = null;
                room.player = 0;

                room.timeout_id = null;

                emitter.sendstate(room,constants.validContext.player_leave);
            }

            break;

        case constants.validState.answer_wait:

            if(room.player>1){
                isPlaying = (token==room.player_order[room.current_player]);
                room = deletePlayerStatus(room,token);
                room = adjustPlayerTurn(room,token);
                room.player--;

                timeoutId = room.timeout_id;
                room.timeout_id = null;

                emitter.sendstate(room,constants.validContext.player_leave);

                room.timeout_id = timeoutId;
    
                if(isPlaying){
                    room.state = constants.validState.current_player_leave;
                }
            } else {
                room = deletePlayerStatus(room,token);
                room.state = constants.validState.current_player_leave;
                room.player_order = [];
                room.current_player = null;
                room.player = 0;

                room.timeout_id = null;

                emitter.sendstate(room,constants.validContext.player_leave);
            }
            break;
    
        default:

            break;
    }

    return room;

}

function adjustPlayerTurn(room,token){

    let playing_token = room.player_order[room.current_player];
    let next_tok;
    if(token == playing_token){
        room = fetchNewPlayer(room,token);
    }

    next_tok = room.player_order[room.current_player];
    room.player_order = room.player_order
        .filter(function(item){return item!=token});

    let index = room.player_order.indexOf(next_tok);
    room.current_player = index;

    console.log("Finished adjust player turn");

    return room;

}

function fetchNewPlayer(room,token){
    let valid_player = false;
    let next_player = room.current_player;
    while(!valid_player){
        next_player = (next_player+1)%room.player_order.length;
        if(room.skipped.has(room.player_order[next_player])){
            room.skipped.delete(room.player_order[next_player]);
        } else {
            if(room.player_order[next_player]!=token){
                valid_player = true;
            }
        }
    }
    room.current_player = next_player;

    return room;
}


function deletePlayerStatus(room,token){

    room = question_module.releaseQuestions(room,token);
    delete room.player_status[token];
    room.player--;

    console.log("Finished delete player status");

    return room;
}


module.exports = {
    init : init,
    handle : handle
}