const event_data = require("../assets/events.json")
const event_cards = require("../assets/test_events.json");
const event_types = event_data.type;
const event_effects = event_data.effect;
const question_module = require("./question_module");
const constants = require("../constants.json");
const config = require("../config.json");
var emitter;


function init(emitter_in){
    emitter = emitter_in;
}

function addFieldToPlayer(player){
    player.equipment = [];
    player.nullifier = [];
    player.reflector = [];
    return player;
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
    
    
    room.state = constants.validState.equipment_use;
    switch(event.type){
        case event_types.event :
            room = handle_event_event(room,event,token);
            break;
        case event_types.equipment :
            room = handle_equipment_event(room,event,token);
            break;
    }



    return room;
}

function handle_event_event(room,event,token){
    switch(event.effect){
        case event_effects.remove_question :
            room = question_module.releaseHeldQuestion(room,token);
            emitter.sendstate(room,constants.validContext.event);
            break;

        case event_effects.remove_key :
            room = question_module.releaseAQuestion(room,token);
            emitter.sendstate(room,constants.validContext.event);
            break;

        case event_effects.stolen :
            room = question_module.releaseQuestions(room,token);
            emitter.sendstate(room,constants.validContext.event);
            break;

        case event_effects.skip :
            room.skipped.add(token);
            emitter.sendstate(room,constants.validContext.event);
            break;
        
        case event_effects.cash :
            room.player_status[token].money += event.nominal; 
            emitter.sendstate(room,constants.validContext.event);
            break;

        case event_effects.start :
            room.player_status[token].square = 0;
            emitter.sendstate(room,constants.validContext.event);
            break;

        case event_effects.roll :
            room.state = constants.validState.roll_again;
            emitter.sendstate(room,constants.validContext.event);
            room.repeated_roll = 2;

        case event_effects.service :
            if(allowedToStoreCard(room,token)){
                room.player_status[token].coupons.push(room.event_pointer);
                room.taken_event_cards.add(room.event_pointer);
                emitter.sendstate(room,constants.validContext.event);
            } else {
                emitter.sendstate(room,constants.validContext.equipment_full);
            }
            break;

        default :
            break;
    
    }
    
    return room;
}

function handle_equipment_event(room,event,token){
    if(allowedToStoreCard(room,token)){
        switch(event.effect){
            case event_effects.cancel :
                room.player_status[token].nullifier.push(room.event_pointer);
                break;
            case event_effects.reverse :
                room.player_status[token].reflector.push(room.event_pointer);
                break;
            default :
                room.player_status[token].equipment.push(room.event_pointer);
                break;
        }
        room.taken_event_cards.add(room.event_pointer);
        emitter.sendstate(room,constants.validContext.equipment);
    } else {
        emitter.sendstate(room,constants.validContext.equipment_full);
    }
    return room;
}

function numberOfHeldEquipment(room,token){
    let player = room.player_status[token];
    let n = 0;
    n += player.nullifier.length;
    n += player.equipment.length;
    n += player.reflector.length;
    n += player.coupons.length;
    return n;
}

function allowedToStoreCard(room,token){
    console.log(numberOfHeldEquipment(room,token));
    console.log(config.max_allowed_equipments);
    return (numberOfHeldEquipment(room,token) < config.max_allowed_equipments);
}

function validEquipmentUseEvent(room,token,msg){
    let playing_token = room.player_order[room.current_player];
    let target_token = msg.target_token;
    let equipment = msg.equipment;

    if((room.state==constants.validState.equipment_use_ready)&&equipment==null){
        return true;
    }

    if(target_token==null){
        return(
            (room.state==constants.validState.equipment_use_ready)&&
            (token==playing_token)&&
            (room.player_status[token].equipment.includes(equipment))
        );
    } else {
        return(
            (room.state==constants.validState.equipment_use_ready)&&
            (token==playing_token)&&
            (room.player_status[token].equipment.includes(equipment))&&
            (room.player_status.hasOwnProperty(target_token))
        );
    }
}

function handleEquipmentUseEvent(room,token,msg){
    
    let equipment = msg.equipment;
    let target_token = msg.target_token;
    if(equipment==null){
        emitter.sendstate(room,constants.validContext.no_equipment);
        room.state = constants.validState.finished;
        return room;    
    }

    let card = event_cards[equipment%event_cards.length];
    if(card.type==event_types.event){
        // Invalid. How even it goes here ?
        room.state = constants.validState.finished;
        return room;
    }

    // Register event to room
    room.from_token = token;
    room.target_token = target_token;
    room.equipment_used = equipment;

    // TODO : Check if others can be hit
    // If so , then execute
    if(card.toOther){

    } else {

        switch(card.effect){
            case event_effects.roll:
                room.state = constants.validState.roll_again;
                break;
            default :
                room.state = constants.validState.finished;
                break;
        }
        // Delete card from player and taken event cards
        room.taken_event_cards.delete(equipment);
        room.player_status[token].equipment = 
            room.player_status[token].equipment.filter(function(el){
                return el!=equipment;
            });
        
        emitter.sendstate(room,constants.validContext.event);
        room.from_token = null;
        room.target_token = null;
        room.equipment_used = null;
    }

    return room;

    


}
module.exports={
    init :init,
    handle : handle,
    addFieldToPlayer : addFieldToPlayer,
    validEquipmentUseEvent : validEquipmentUseEvent,
    handleEquipmentUseEvent : handleEquipmentUseEvent
}
