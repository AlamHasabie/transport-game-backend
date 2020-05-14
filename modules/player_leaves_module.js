var constants = require("../constants.json");
var config = require("../config.json");
var emitter;



function init(emitter_in){

    emitter = emitter_in;

}

function handle(room,token){

    let playing_token = room.player_order[room.current_player];
    let isPlaying = (playing_token==token);
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
                startgame(room);   
            }
            break;

        case validState.rolling:

            deleteplayerduringgame(room,token);

            if(thistokenplaying){
                sendcurrentstatedata(room,validContext.turn);
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