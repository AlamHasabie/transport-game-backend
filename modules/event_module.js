const event_data = require("../assets/events.json")
const event_cards = require("../assets/test_events.json");
const event_types = event_data.type;
const event_effects = event_data.effect;
const question_module = require("./question_module");
const answer_module = require("./answer_module");
const constants = require("../constants.json");
const config = require("../config.json");
var emitter;


function init(emitter_in){
    emitter = emitter_in;
}

function addFieldToPlayer(player){
    player.equipment = [];
    player.shield = [];
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
            case event_effects.reverse :
                room.player_status[token].shield.push(room.event_pointer);
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
    n += player.shield.length;
    n += player.equipment.length;
    n += player.coupons.length;
    return n;
}

function allowedToStoreCard(room,token){
    return (numberOfHeldEquipment(room,token) < config.max_allowed_equipments);
}

function validEquipmentUseEvent(room,token,msg){
    let playing_token = room.player_order[room.current_player];
    let target_token = msg.target_token;
    let equipment = msg.equipment;

    if(token!=playing_token){
        return false;
    }
    if(!(room.state==constants.validState.equipment_offer)){
        return false;
    }
    if(equipment==null){
        return true;
    }
    if(!room.player_status[token].equipment.includes(equipment)){
        return false;
    }
    let card = event_cards[equipment%event_cards.length];
    if(!(card.type == event_types.equipment)){
        return false;
    }
    if (!card.toOther){
        return true;
    }
    if(target_token==null){
        return false;
    }
    if(!room.player_status.hasOwnProperty(target_token)){
        return false;
    }
    return true;
}

function handleEquipmentUseEvent(room,token,msg){
    
    let equipment = msg.equipment;
    let target_token = msg.target_token;
    if(equipment==null){
        emitter.sendstate(room,constants.validContext.no_equipment);
        room.state = constants.validState.finished;
        return room;    
    }

    room.from_token = token;
    room.target_token = target_token;
    room.equipment_used = equipment;
    room.reply_equipment = null;

    let card = event_cards[equipment%event_cards.length];
    if(card.toOther){
        if(room.player_status[target_token].shield.length>0){
            room.state = constants.validState.shield_offer;
            emitter.sendstate(room,constants.validContext.shield_offer);
        } else {
            room = executeEquipment(room);
        }
    } else {
        room = executeEquipment(room);
    }

    return room;
}

function validShieldEvent(room,token,msg){

    if(room.state!=constants.validState.shield_offer){
        return false;
    }
    if(room.target_token!=token){
        return false;
    }

    let card_no = msg.equipment;
    if(card_no==null){
        return true;
    }

    if(!room.player_status[token].shield.includes(card_no)){
        return false;
    }

    let card = event_cards[card_no%event_cards.length];
    if(card.effect==event_effects.cancel){
        return true;
    }

    if(card.effect==event_effects.reverse){
        return true;
    }

    return true;
}

function handleShieldEvent(room,token,msg){
    room.reply_equipment = msg.equipment;
    return executeEquipment(room);
}


function executeEquipment(room){
    let reply_card ;
    let execute_from = room.from_token;
    let execute_to = room.target_token;
    let card = event_cards[room.equipment_used%event_cards.length];
    if(room.reply_equipment!=null){
        reply_card = event_cards[room.reply_equipment%event_cards.length];
    }

    if(reply_card!=null){
        if(reply_card.effect==event_effects.cancel){
            room = resetCardsAfterEquipmentUse(room);
            emitter.sendstate(room,constants.validContext.cancel);
            room.state = constants.validState.finished;
            return room;
        } else if(reply_card.effect==event_effects.reverse){
            let temp = execute_from;
            execute_from = execute_to;
            execute_to = temp;
        }
    }
    switch(card.effect){
        
        case event_effects.roll:
            emitter.sendstate(room,constants.validContext.equipment_use);
            room.state = constants.validState.roll_again;
            room.repeated_roll = 1;
            break;

        case event_effects.take_question:
            if(!question_module.playerHasQuestion(room,execute_from)){
                room = question_module.givequestion(room,execute_from);
            }
            emitter.sendstate(room,constants.validContext.equipment_use);
            room.state = constants.validState.finished;
            break;

        case event_effects.take_answer:
            room.answers_drawed = 1;
            room = answer_module.handle(room);
            if(!(room.state==constants.validState.answer_wait)){
                room.state = constants.validState.finished;
            } 
            break;

        case event_effects.rob : 
            room.player_status[execute_from].money+=card.nominal;
            room.player_status[execute_to].money-=card.nominal;
            emitter.sendstate(room,constants.validContext.equipment_use);
            room.state = constants.validState.finished;
            break;

        case event_effects.remove_question :
            room = question_module.releaseHeldQuestion(room,execute_to);
            emitter.sendstate(room,constants.validContext.equipment_use);
            room.state = constants.validState.finished;
            break;
        case event_effects.skip:
            room.skipped.add(execute_to);
            emitter.sendstate(room,constants.validContext.equipment_use);
            room.state = constants.validState.finished;
        default :
            room.state = constants.validState.finished;
            break;
    }

    room = resetCardsAfterEquipmentUse(room);
    return room;
}

function resetCardsAfterEquipmentUse(room){
    room.taken_event_cards.delete(room.equipment_used);
    room.player_status[room.from_token].equipment = 
    room.player_status[room.from_token].equipment.filter(function(el){
        return el!=room.equipment_used;
    });
    if(room.reply_equipment!=null){
        room.taken_event_cards.delete(room.reply_equipment);
        room.player_status[room.target_token].equipment = 
        room.player_status[room.target_token].equipment.filter(function(el){
            return el!=room.reply_equipment;
        });
    }

    room.from_token = null;
    room.target_token = null;
    room.equipment_used = null;
    room.reply_equipment = null;
    room.is_equipment_used = true;
    return room;
        
}
module.exports={
    init :init,
    handle : handle,
    addFieldToPlayer : addFieldToPlayer,
    validEquipmentUseEvent : validEquipmentUseEvent,
    handleEquipmentUseEvent : handleEquipmentUseEvent,
    validShieldEvent : validShieldEvent,
    handleShieldEvent : handleShieldEvent
}
