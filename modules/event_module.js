const event_data = require("../assets/events.json")
const event_cards = require("../assets/test_events.json");
const event_types = event_data.type;
const event_effects = event_data.effect;
const question_module = require("./question_module");
const constants = require("../constants.json");








function nextEvent(room,token){

    var candidate = room.event_pointer;
    var valid_event = false;
    while(!valid_event){
        if(room.taken_event_cards.has(candidate)){
            candidate = (candidate+1)%event_cards.length;
        } else {
            valid_event = true;
        }
    }

    // Equipment should be hidden from other player(s)
    // For now we could just send em all
    room.event_pointer = candidate;
    room.current_event = {}
    room.current_event.type = event_cards[candidate].type;

    if(event_cards[candidate].type == event_types.equipment){
        room = addEquipment(room,token,candidate);
    } else {
        
        room = processEvent(room,token,candidate);
    }

    return room;
}

function addEquipment(room,token,index){

    var card = event_cards[index];
    var equipment = {
        id : index,
        card : card
    }
    room.player_status[token].equipment.add(equipment);
    room.taken_event_cards.add(index);

    if(card.effect == event_effects.cancel){
        room.player_status[token].hasCancel = true;
    }

    if(card.effect == event_effects.reverse){
        room.player_status[token].hasReverse = true;
    }

    return room;
};

function processEvent(room,token,index){


    var event = event_cards[index];

    room.current_event = event;

    switch(event.effect){
        case event_effects.start :
            room.player_status[token].square = 0;
            break;
        
        case event_effects.stolen :
            room = question_module.releaseQuestions(room,token);
            break;

        case event_effects.cash :
            room.player_status[token].money += event.nominal;
            break;

        case event_effects.skip : 
            room.skipped.add(token);


        room.state = constants.validState.finish_turn;
            break;

        default :
            break;
    }  

    return room;
}

function executeEquipment(room,token,to,event){

    return room;
}





module.exports = {
    nextEvent : nextEvent
}
