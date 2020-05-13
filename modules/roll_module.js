var emitter;
var constants = require('../constants.json');
var board_length = require('../assets/board.json').length;




function init(emitter_in){

    emitter = emitter_in;

}

function handle(room){

    let dice_1 = room.dice_1;
    let dice_2 = room.dice_2;
    let rolled = room.repeated_roll;
    let token = room.player_order[room.current_player];

    let movement = dice_1 + dice_2;
    let current_square = room.player_status[token].square
    let to_square = (movement + current_square)%board_length;

    room.player_status[token].square = to_square;
    
    if(dice_1==dice_2&&rolled<2){

        room.repeated_roll++;
        emitter.sendstate(room,constants.validContext.roll_again);

    } else {

        emitter.sendstate(room,constants.validContext.move);
        room.state = constants.validState.activation;

    }

    return room;
}

module.exports = {
    init:init,
    handle : handle
}