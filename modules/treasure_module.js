var treasure = require("../assets/treasure.json");
var config = require("../config.json");
var constants = require("../constants.json")
var emitter;





function init(emitter_in){
    emitter = emitter_in;
}

function handle(room){
    let token = room.player_order[room.current_player];
    let n_questions = room.player_status[token].questions_answered.length;
    if(n_questions >= config.treasure_minimal_questions){

        room.state = constants.validState.treasure_wait;
        room = emitter.sendstate(room,constants.validContext.treasure);

    } else {

        room.state = constants.validState.equipment_use;

    }

    return room;
}

module.exports = {
    init : init,
    handle : handle
}