const constants = require("../constants.json");



function newRoom(){

    return {
        state : constants.validState.prepare,
        player : 0,
        gamemaster : new Set(),
        spectator : new Set(),
        player_ready : new Set(),
        roll_wait : new Set(),
        taken_questions : new Set(),
        skipped : new Set(),
        first_roll : [],
        player_order : [],
        offered_answer : null,
        current_player : null,
        event_pointer : 0,
        reward_pointer : 0,
        answers_drawed: 0,
        key_pointer : 0,
        question_pointer : 0,
        player_status : {}
    }
}

function buildRoomTurnOrder(room){

    var current_max_dice, current_index;

    for(var i = 0 ; i < room.player ; i++){
        current_max_dice = 0;
        current_index = 0;
        for(var k = 0; k < room.first_roll.length ; k++){
            if((room.first_roll[k].dice>current_max_dice)){
                current_max_dice = room.first_roll[k].dice;
                current_index = k;    
            }
        }

        // Get taken token
        var token = room.first_roll[current_index].token;

        // Add max as first element of player turn
        room.player_order.push(token);

        // Delete element with the same token
        room.first_roll = room.first_roll.filter(function(el){
            return el.token != token;
        });
    }

    room.first_roll = null;

    return room;

}


module.exports= {
    newRoom : newRoom,
    buildRoomTurnOrder : buildRoomTurnOrder
}