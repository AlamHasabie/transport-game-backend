var constants = require("../constants.json");
var config = require("../config.json");
var emitter;



function init(emitter_in){

    emitter = emitter_in;

}

function handle(room,token){

    var thistokenplaying = isPlayingToken(token,room);
    switch (gameState[room].state) {
        case validState.prepare:

            delete gameState[room].player_status[token];
            gameState[room].player_ready.delete(token);
            gameState[room].roll_wait.delete(token);

            io.to(room).emit("player leaves",{
                token : token
            })


            gameState[room].player--;

            emitplayerleaves(room,token);

            // If player ready becomes zero, then kickstart the game earlier.
            if(gameState[room].player_ready.size==0&&gameState[room].player>=config.minimal_player){

                // Delete player_ready element
                delete gameState[room].player_ready;

                // Set to game ready
                gameState[room].state = validState.ready;
                sendcurrentstatedata(room,validContext.game_ready); 
            }
            break;

        case validState.ready:

            gameState[room].first_roll = gameState[room].first_roll
                .filter(function(item){return item != token});

            gameState[room].roll_wait.delete(token);
            delete gameState[room].player_status[token];

            gameState[room].player--;            
            emitplayerleaves(room,token);

            if(gameState[room].roll_wait.size == 0){
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