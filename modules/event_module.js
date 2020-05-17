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
}

function handle(room){

    room = next_event(room);

    let token = room.player_order[room.current_player];
    let event = event_cards[room.event_pointer];

    emitter.sendstate(room,constants.validContext.event);

    switch(event.type){
        case event_types.event :
            room = handle_event_event(room,event);
            break;
        case event_types.equipment :
            room = handle_equipment_event(room,event);
            break;
    }
    
    return room;
}

function handle_event_event(room,event){

    switch(event.effect){


        case event_effects.remove_question :
            break;

        case event_effects.remove_key :
            break;

        case event_effects.skip :
            break;
        
        case event_effects.cash :
            break;

        case event_effects.start :
            break;

        case event_effects.
        

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


