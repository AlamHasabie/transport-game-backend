var constants = require("../constants.json");
var config = require("../config.json");
var emitter;

function init(emitter_in){

    emitter = emitter_in;
}


function newRoom(){

    return {
        state : constants.validState.prepare,
        player : 0,
        dice_1 : null,
        dice_2: null,
        preparing_players : [],
        ready_players : [],
        gamemaster : new Set(),
        spectator : new Set(),
        player_ready : new Set(),
        roll_wait : new Set(),
        taken_questions : new Set(),
        taken_event_cards : new Set(),
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
        player_status : {},
        from_token : null,
        target_token : null,
        equipment_used : null,
        reply_equipment : null,
        is_equipment_used : false,
        game_timeout : config.default_game_length,
        start_time : null,
        time_left : null
    }
}

function startGame(room){

    room = buildTurnOrder(room);
    room.state = constants.validState.rolling;
    room.current_player = 0;
    room.repeated_roll = 0;

    delete room.roll_wait;

    room = emitter.sendstate(room,constants.validContext.game_start);
    room = emitter.sendstate(room,constants.validContext.turn);

    return room;
}

function buildTurnOrder(room){

    let current_max_dice,current_index,token;

    while(room.first_roll.length > 0){
        current_max_dice = 0;
        current_index = 0;
        for(var k = 0; k < room.first_roll.length ; k++){
            if((room.first_roll[k].dice>current_max_dice)){
                current_max_dice = room.first_roll[k].dice;
                current_index = k;    
            }
        }

        // Get taken token
        token = room.first_roll[current_index].token;

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
    init:init,
    startGame : startGame,
    newRoom : newRoom
}