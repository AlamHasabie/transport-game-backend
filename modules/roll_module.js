var emitter;
var constants = require('../constants.json');
var config = require('../config.json');
var board_length = require('../assets/board.json').length;




function init(emitter_in){

    emitter = emitter_in;

}

function validRollEvent(room,token,msg){
    let playing_token = room.player_order[room.current_player];
    return(
        (room.state==constants.validState.rolling)&&
        (token==playing_token)
    );
}

function handleRollEvent(room,token,msg){

    let dice_1 = msg.dice_1;
    let dice_2 = msg.dice_2;
    let rolled = room.repeated_roll;

    room.dice_1 = dice_1;
    room.dice_2 = dice_2;
    
    let movement = dice_1 + dice_2;
    let current_square = room.player_status[token].square
    let to_square = (movement + current_square)%board_length;

    room.player_status[token].square = to_square;
    
    room = emitter.sendstate(room,constants.validContext.move);
    if(dice_1==dice_2&&rolled<config.max_double_roll){
        room.repeated_roll++;
        room.state = constants.validState.roll_again;
    } else {
        room.repeated_roll = 0;
        room.state = constants.validState.activation;
    }

    return room;
}

module.exports = {
    init:init,
    handleRollEvent : handleRollEvent,
    validRollEvent : validRollEvent
}