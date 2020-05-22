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


        /** Assume that only valid player would be able to enter the room */
        case constants.validState.prepare:
        case constants.validState.ready:

            break;

        case constants.validState.treasure_wait :
        case constants.validState.finished : 
        case constants.validState.activation :
        case constants.validState.rolling :
        case constants.validState.answer_wait : 
            break;
        /** Just delete the player here */
        /** We would just reduce the player count to 0 */
        /** Later , the server would delete the room eventually */
        case constants.validState.ended :
            room.player_order = room.player_order.filter(function(el){
                return el != token;
            });
            break;
        default:
            break;
    }
    return room;
}

module.exports = {
    init : init,
    handle : handle
}