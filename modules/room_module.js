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
        taken_event_cards : new Set(),
        skipped : new Set(), 
        challenged_token : null,
        activated_equipment : null,
        barrier_equipment : null,
        first_roll : [],
        player_order : [],
        offered_answer : null,
        current_player : null,
        current_event : null,
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

        var token = room.first_roll[current_index].token;

        room.player_order.push(token);
        room.first_roll = room.first_roll.filter(function(el){
            return el.token != token;
        });
    }

    room.first_roll = null;

    return room;

}

function addNewPlayer(room,username,token){
    room.player_status[token] = {
        username : username,
        money : 150,
        square : 0,
        held_question : null,
        questions_answered : new Set(),
        equipment : {},
        n_equipments : 0,
        hasReverse : false,
        hasCancel : false
    }

    return room;
}

function prepareRoomToStart(room){

    room.state = constants.validState.rolling;
    room = buildRoomTurnOrder(room);

    room.current_player = 0;
    room.repeated_roll = 0;

    delete room.roll_wait;

    return room;
}


module.exports= {
    newRoom : newRoom,
    buildRoomTurnOrder : buildRoomTurnOrder,
    prepareRoomToStart : prepareRoomToStart,
    addNewPlayer : addNewPlayer
}