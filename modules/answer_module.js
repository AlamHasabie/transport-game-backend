var question_module = require("./question_module");
var questions = question_module.questions;
var answers = require("../assets/answers.json"); 
var constants = require("../constants.json")
var emitter;

function init(emitter_in){

    emitter = emitter_in;

}

function handle(room){

    let token = room.player_order[room.current_player];


    if(question_module.playerHasQuestion(room,token)){
        room = giveKey(room); 
    }


    return room;
}

function giveKey(room){


    let token = room.player_order[room.current_player];

    room.state = constants.validState.answer_wait;
    room.key_pointer = (room.key_pointer+1)%answers.length;
    room.answers_drawed++;

    emitter.sendstate(room,constants.validContext.key);

    return room;
}

function handleAnswerEvent(room){

    let token = room.player_order[room.current_player];
    let no = room.player_status[token].held_question;
    let answer = room.answer;

    if(answer == null){
        if(room.answers_drawed>=2){
            emitter.sendstate(room,constants.validContext.no_answer);
            room.answers_drawed = 0;
            room.answer = null;
            room.state = constants.validState.finished;

            return room;
        } else {
            return giveKey(room);
        }
    } else {

        if(questions[no].answer.includes(answer)){
            emitter.sendstate(room,constants.validContext.answer_true);
            room = question_module.addAnsweredQuestion(room,token);
        } else {
            emitter.sendstate(room,constants.validContext.answer_false);
        }

        room.answers_drawed = 0;
        room.answer = null;
        room.state = constants.validState.finished;

        return room;
    }

}

module.exports = {
    init:init,
    handle:handle,
    handleAnswerEvent:handleAnswerEvent
}

