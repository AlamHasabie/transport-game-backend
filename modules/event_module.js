const event_data = require("../assets/events.json")
const event_cards = require("../assets/test_events.json");
const event_types = event_data.type;
const event_effects = event_data.effect;
const question_module = require("./question_module");
const constants = require("../constants.json");
var emitter;


function init(emitter_in){
    emitter = emitter_in;
}

function next_event(room){
    let current_event = room.event_pointer;
    let valid_event  = false;
    while(!valid_event){
        if(room.taken_event_cards.has(current_event)){
            current_event = (current_event+1)%event_cards.length;
        } else {
            valid_event = true;
        }
    }
    room.event_pointer = current_event;

    return room;
}

function handle(room){

    room = next_event(room);

    let token = room.player_order[room.current_player];
    let event = event_cards[room.event_pointer];
    
    
    room.state = constants.validState.finished;
    switch(event.type){
        case event_types.event :
            room = handle_event_event(room,event,token);
            break;
        case event_types.equipment :
            room = handle_equipment_event(room,event,token);
            break;
    }


    emitter.sendstate(room,constants.validContext.event);
    return room;
}

function handle_event_event(room,event,token){
    switch(event.effect){
        case event_effects.remove_question :
            room = question_module.releaseHeldQuestion(room,token);
            break;

        case event_effects.remove_key :
            room = question_module.releaseAQuestion(room,token);
            break;

        case event_effects.stolen :
            room = question_module.releaseQuestions(room,token);
            break;

        case event_effects.skip :
            room.skipped.add(token);
            break;
        
        case event_effects.cash :
            room.player_status[token].money += event.nominal; 
            break;

        case event_effects.start :
            room.player_status[token].square = 0;
            break;

        case event_effects.roll :
            room.state = constants.validState.rolling;
            room.repeated_roll = 2;

        case event_effects.service :
            console.log("service");
            room.player_status[token].coupons.push(room.event_pointer);
            room.taken_event_cards.add(room.event_pointer);

            break;

        default :
            break;
    
    }
    
    return room;
}

function handle_equipment_event(room,event){

    return room;
}


module.exports={
    init :init,
    handle : handle
}


