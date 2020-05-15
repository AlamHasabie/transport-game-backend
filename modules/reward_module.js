var rewards = require("../assets/rewards.json");
var constants = require("../constants.json");
var emitter;




function init(emitter_in){
    emitter = emitter_in;
}

function handle(room){

    let token = room.player_order[room.current_player];
    let reward = rewards[room.reward_pointer];

    room.player_status[token].money += reward.nominal;
    room.reward_pointer = (room.reward_pointer+1)%rewards.length;

    room = emitter.sendstate(room,constants.validContext.reward);

    room.state = constants.validState.finished;

    return room;


}

module.exports = {
    init:init,
    handle : handle
}