var constants = require("../constants.json");
var config = require("../config.json");
var room_module = require("./room_module");
var question_module = require("./question_module");
var emitter;

/** This game assumes that leaving player after ready state will join again in the future */


function init(emitter_in){

    emitter = emitter_in;
    room_module.init(emitter);
    question_module.init(emitter);

}

function handle(room,token){

    let isPlaying;

    switch (room.state) {

        /** When prepare, user could still leave the room */
        /** Open new room for a new player */
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
                room = emitter.sendstate(room,constants.validContext.player_leave);
                room = emitter.sendstate(room,constants.validContext.game_ready); 
            }
            break;

        case constants.validState.ready:

            break;

        case constants.validState.treasure_wait :
        case constants.validState.finished : 
        case constants.validState.activation :
        case constants.validState.rolling :
            isPlaying = (token==room.player_order[room.current_player]);
            if(isPlaying){
                room.state = constants.validState.current_player_leave;
            }

            break;

        case constants.validState.answer_wait:
            isPlaying = (token==room.player_order[room.current_player]);
            if(isPlaying){
                room.state = constants.validState.current_player_leave;
                room.answer = null;
                room.answers_drawed = 0;
            }
            break;

        /** Just delete the player here */
        /** We would just reduce the player count to 0 */
        /** Later , the server would delete the room eventually */
        case constants.validState.ended :
        default:
            room.player = room.player - 1;
            break;
    }
    return room;
}

module.exports = {
    init : init,
    handle : handle
}