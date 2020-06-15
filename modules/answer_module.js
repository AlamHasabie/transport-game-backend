var question_module = require("./question_module");
var questions = question_module.questions;
var answers = require("../assets/answers.json"); 
var config = require("../config.json");
var constants = require("../constants.json")
var emitter;

function init(emitter_in){

    emitter = emitter_in;

}

function handle(room){

    room.answers_draw = 2;
    let token = room.player_order[room.current_player];
    if(question_module.playerHasQuestion(room,token)){
        room = giveKey(room); 
    } else {
        room.state = constants.validState.equipment_use;
    }
    return room;
}

function giveKey(room){

    room.keys = [];
    room.state = constants.validState.answer_wait;
    for(i = 0 ; i < room.answers_draw ; i++){
        room.keys.push(room.key_pointer);
        room.key_pointer = (room.key_pointer+1)%answers.length;
    }
    room = emitter.sendstate(room,constants.validContext.key);
    return room;
}

function validAnswerEvent(room,token,msg){
    let playing_token = room.player_order[room.current_player];
    if(room.keys.length==0){
        return false;
    }
    if(!room.state==constants.validState.answer_wait){
        return false;
    }
    if(playing_token!=token){
        return false;
    }
    if(!question_module.playerHasQuestion(room,token)){
        return false;
    }

    if(msg.selected==null){
        return true;
    }

    if(!room.keys.includes(msg.selected)){
        return false;
    }

    return true;
}

function handleAnswerEvent(room,token,msg){

    let no = room.player_status[token].held_question;
    let answer = msg.selected;
    room.answer = answer;
    if(room.answer == null){
        room = emitter.sendstate(room,constants.validContext.no_answer);
        room.state = constants.validState.equipment_use;
    } else {
        let answer_text = answers[room.answer];
        room.state = constants.validState.equipment_use;
        if(questions[no].answer.includes(answer_text)){
            room = question_module.addAnsweredQuestion(room,token);
            room.player_status[token].money+=config.answer_reward;
            room = emitter.sendstate(room,constants.validContext.answer_true);
        } else {
            room = emitter.sendstate(room,constants.validContext.answer_false);
        }
    }
    room.keys = []
    return room;
}

module.exports = {
    init:init,
    handle:handle,
    handleAnswerEvent:handleAnswerEvent,
    validAnswerEvent:validAnswerEvent
}

