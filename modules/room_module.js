var constants = require("../constants.json");




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


module.exports= {
    newRoom : newRoom
}