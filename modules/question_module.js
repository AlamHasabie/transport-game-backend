var questions = require("../assets/questions.json");
var constanst = require("../constants.json");
var sender;



function init(sender_in){

    sender = sender_in;

}

function addAnsweredQuestion(room,token){
    let no = room.player_status[token].held_question;
    room.player_status[token].questions_answered.add(no);
    room.player_status[token].held_question = null;

    return room;
}


function givequestion(roomstate,token){

    var current_question = roomstate.question_pointer;
    while(roomstate.taken_questions.has(current_question)){
        current_question = (current_question+1)%questions.length;
    }
    // Add question to room status
    roomstate.taken_questions.add(current_question);

    // Change pointer
    roomstate.question_pointer  = current_question;

    // Add question to player status
    roomstate.player_status[token].held_question = current_question;

    return roomstate;

}

function releaseAnsweredQuestions(roomstate,token){
    roomstate.player_status[token].questions_answered.forEach(function(el){
        roomstate.taken_questions.delete(el);
    });
    roomstate.player_status[token].questions_answered = new Set();

    return roomstate;
}

function releaseQuestions(roomstate,token){

    roomstate = releaseAnsweredQuestions(roomstate,token);
    roomstate = releaseHeldQuestion(roomstate,token);

    return roomstate;
    
}
function releaseHeldQuestion(roomstate,token){
    if(roomstate.player_status[token].held_question!=null){
        roomstate.taken_questions.delete(roomstate.player_status[token].held_question.no);
        roomstate.player_status[token].held_question = null;
    }

    return roomstate;
}

function playerHasQuestion(roomstate,token){
    return roomstate.player_status[token].held_question != null;
}


function handle(room){
    
    let token = room.player_order[room.current_player];

    if(playerHasQuestion(room,token)){

    } else {

        room = givequestion(room,token);
        sender.sendstate(room,constanst.validContext.question);

    }

    room.state = constanst.validState.finished;

    return room;
}


module.exports = {
    addAnsweredQuestion : addAnsweredQuestion,
    questions : questions,
    playerHasQuestion : playerHasQuestion,
    releaseAnsweredQuestions : releaseAnsweredQuestions,
    releaseHeldQuestion : releaseHeldQuestion,
    releaseQuestions : releaseQuestions,
    givequestion : givequestion,
    init : init,
    handle : handle,
}


