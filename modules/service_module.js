const constants = require("../constants.json");
var emitter;

function init(emitter_in){
    emitter = emitter_in;
}

function addFieldToPlayer(player){
    player.coupons = [];

    return player;
}

function handle(room){
    let coupon_used;
    let token = room.player_order[room.current_player];

    if(room.player_status[token].coupons.length>0){
        coupon_used = room.player_status[token].coupons.pop();
        room.taken_event_cards.delete(coupon_used);
        emitter.sendstate(room,constants.validContext.coupon_use);
    } else {
        room.skipped.add(token);
        room.player_status[token].money -= 15;
        emitter.sendstate(room,constants.validContext.service);
    }

    room.state = constants.validState.finished;    
    return room;
}


module.exports={
    init: init,
    handle : handle,
    addFieldToPlayer : addFieldToPlayer
}