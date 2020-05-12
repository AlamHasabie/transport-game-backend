var questions = require("../assets/questions.json");

function givequestion(roomstate,token){

    var current_question = roomstate.question_pointer;
    while(roomstate.taken_questions.has(current_question)){
        current_question = (current_question+1)%questions.length;
    }
    // Add question to room status
    roomstate.taken_questions.add(current_question);

    // Change pointer
    roomstate.question_pointer  = current_question;

    // Add question to player statuse
    roomstate.player_status[token].held_question = {};
    roomstate.player_status[token].held_question.text = questions[current_question].question;
    roomstate.player_status[token].held_question.no = current_question;


    return roomstate;

}

function releaseQuestions(roomstate,token){

    roomstate.player_status[token].questions_answered.forEach(function(el){
        roomstate.taken_questions.delete(el.no);
    });
    roomstate.player_status[token].questions_answered.clear();
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

function releaseAQuestion(roomstate,token){

    if(roomstate.player_status[token].questions_answered.size>0){
        // Fetch an iterator and send it
        const iterator1 = roomstate.player_status[token].questions_answered.values();
        var value = iterator1.next().value;

        roomstate.player_status[token].questions_answered.delete(value);
        roomstate.taken_questions.delete(value);
    }

    return roomstate;

}


module.exports = {
    questions : questions,
    playerHasQuestion : playerHasQuestion,
    releaseHeldQuestion : releaseHeldQuestion,
    releaseAQuestion  : releaseAQuestion,
    releaseQuestions : releaseQuestions,
    givequestion : givequestion
}


