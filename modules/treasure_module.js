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

        room.state = constants.validState.treasure_offer;
        room = emitter.sendstate(room,constants.validContext.treasure_offer);

    } else {

        room.state = constants.validState.equipment_use;

    }

    return room;
}

function validTreasureOfferEvent(room,token, msg){
    let playing_token = room.player_order[room.current_player];
    if(!room.state==constants.validState.treasure_offer){
        return false;
    }
    if(playing_token!=token){
        return false;
    }
    if(!(typeof msg.selected == "boolean")){
        return false;
    }

    return true;

}

function handleTreasureOfferEvent(room, token , msg){
    if(msg.selected){
        room.state = constants.validState.treasure_wait;
        room = emitter.sendstate(room, constants.validContext.treasure);
    } else {
        room.state = constants.validState.equipment_use;
        room = emitter.sendstate(room,constants.validContext.no_treasure);
    }
    return room;

}

module.exports = {
    init : init,
    handle : handle,
    validTreasureOfferEvent : validTreasureOfferEvent,
    handleTreasureOfferEvent : handleTreasureOfferEvent
}