const express = require('express');
const app = express();
const path = require('path');
const roomstatepath = "/rooms/";
const fs = require('fs');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var crypto = require("crypto");

/** Assets library  */
const questions = require('./assets/questions.json');
const answers = require('./assets/answers.json');
const rewards = require('./assets/rewards.json');

const validState = {
    prepare : 0,
    ready : 1,
    rolling : 2,
    activation : 3,
    answer_wait : 4,
    finished : 5
}



/** Server initialization */
global.gameState = {}
global.userInfo = {};



/** This is for testing purpose only */
app.use(bodyParser.urlencoded());
app.get('/',(req,res)=>{
    res.render('index.ejs');
});

app.set('view engine', 'ejs');

app.post('/game',(req,res)=>{
    
    var roomname = req.body["room"];
    var role = req.body["role"];
    var username = req.body["username"];
    
    if(gameState.hasOwnProperty(roomname)){

        if(!(role=="player"||role=="spectator")){
            res.statusCode = 400;
            res.send("Bad request, role not defined");
            return;
        }

        if(role=="player"&&gameState[roomname].player>=4){
            res.statusCode = 403;
            res.send("Forbidden : full gameroom");
            return;
        }
    } else {
        createnewroom(roomname);
    }
    
    // Generate token
    var id = crypto.randomBytes(20).toString('hex');
    while(userInfo.hasOwnProperty(id)){
        id = crypto.randomBytes(20).toString('hex');
    }

    // Add user info
    userInfo[id] = {
        roomname : roomname,
        role : role,
        username : username
    }

    /**Add number of player */
    gameState[roomname].player++;

    res.statusCode = 200;
    res.render('game',{
        token : id
    });
});


/** SOCKETS */
io.on('connection',(socket)=>{

    var token = socket.handshake.query.token;


    if(!userInfo.hasOwnProperty(token)){

        socket.disconnect();

    } else {

        var role = userInfo[token].role;
        var room = userInfo[token].roomname;

        if(role == "player"){

            if(isRoomState(room,"prepare")){

                registerValidPlayer(socket,token);


            } else {

                socket.disconnect();

            }

        } else if (role=="spectator") {

            registerValidSpectator(socket,token);

        } else {

            console.log("Role unknown, illegal argument");


        }
    }
});

http.listen(3000,()=>{
    console.log('listening on 3000');
});


/**Utils */
/**This part is created so that function can be more modular in the future */
function createnewroom(roomname){
    let new_room_data = {
        state : "prepare",
        player : 0,
        player_ready : new Set(),
        roll_wait : new Set(),
        taken_questions : new Set(),
        first_roll : [],
        player_order : [],
        current_player : null,
        event_pointer : 0,
        reward_pointer : 0,
        key_pointer : 0,
        question_pointer : 0,
        player_status : {}
    }

    gameState[roomname] = new_room_data;
}

// Get turn order
function buildturnorder(roomname){

    for(var i = 0 ; i < gameState[roomname].player ; i++){
        console.log(gameState[roomname].first_roll);
        current_max_dice = 0;
        current_index = 0;
        for(var k = 0; k < gameState[roomname].length ; k++){
            if((gameState[roomname].first_roll[k].dice>current_max_dice)){
                current_max_dice = gameState[roomname].first_roll[k].dice;
                current_index = k;    
            }
        }

        // Get taken token
        var token = gameState[roomname].first_roll[current_index].token;

        // Add max as first element of player turn
        gameState[roomname].player_order.push(token);

        // Delete element with the same token
        gameState[roomname].first_roll = gameState[roomname].first_roll.filter(function(el){
            return el.token != token;
        });
    }

    // Delete first_roll
    delete gameState[roomname].first_roll
}


function isPlayingToken(token,room){
    return token==gameState[room].player_order[gameState[room].current_player];
}

function isRoomState(room,state){
    return gameState[room].state==state
}

function playerHasQuestion(room,token){
    return gameState[room].player_status[token].question != null;
}


function registerValidPlayer(socket,token){

    var user = userInfo[token];
    var room = user.roomname;
    var username = user.username;

    /** Join socket to room */
    socket.join(room);

    /** Add information regarding the user */
    gameState[room].player_status[token] = {
        money : 150,
        square : 0,
        question : null,
        question_answered : 0
    }
    
    /** Add to ready queue */
    gameState[room].player_ready.add(token);


    io.to(room).emit("player join",{
        token : token,
        username : username,
        status : gameState[room]
    })

    // TODO : send server data to spectator
    socket.on('ready',function(msg){
        if(gameState[room].state == "prepare"){
            gameState[room].player_ready.delete(token);

            io.to(room).emit("player ready",{
                token : token
            })

            // Add to turn determination list
            gameState[room].roll_wait.add(token);

            if(gameState[room].player_ready.size==0){

                // Delete player_ready element
                delete gameState[room].player_ready;

                // Set to game ready
                gameState[room].state = "ready";
                io.to(room).emit("game ready"); 
            }
        }


        console.log(gameState[room]);
    });

    /** Second step, when game is in ready state */
    /** Assume legal actions taken by all clients */

    /** First Roll */
    socket.on("first roll",function(msg){
        if(gameState[room].state=="ready"){

            // Remove token from set
            gameState[room].roll_wait.delete(token);

            // Get dice number
            var dice = msg.dice_1 + msg.dice_2;

            gameState[room].first_roll.push({
                token : token,
                dice : dice
            });

            console.log(gameState[room].first_roll);

            if(gameState[room].roll_wait.size == 0 ){

                // Start the game
                gameState[room].state = "rolling"

                // Build order
                buildturnorder(room);

                // Emit turn order
                io.to(room).emit("player order",gameState[room].player_order);

                // Emit game start
                io.to(room).emit("game start");

                // Set first playing player
                gameState[room].current_player = 0;

                // Emit information about turn
                io.to(room).emit("turn",{
                    token : gameState[room].player_order[0]
                })

                gameState[room].repeated_roll = 0;

                // Delete roll wait
                delete gameState[room].roll_wait;
                console.log(gameState[room]);
            }
        }
    });


    socket.on("roll",function(msg){
        if((gameState[room].state == "rolling")&&
        isPlayingToken(token,room)){
            var dice_1 = msg.dice_1;
            var dice_2 = msg.dice_2;

            // Announce dice roll
            io.to(room).emit("roll info",{
                dice_1 : msg.dice_1,
                dice_2 : msg.dice_2
            });

            var movement = msg.dice_1 + msg.dice_2;
            var tosquare = (gameState[room].player_status[token].square + movement)%40;
            gameState[room].player_status[token].square = tosquare;
            // Announce position change
            io.to(room).emit("position change",{
                token : token,
                to : tosquare
            });

            // Check if dice is same
            // If same, then ask to roll again
            if((dice_1==dice_2)&&(gameState[room].repeated_roll<=2)){
                io.to(room).emit("roll again",{
                    token : token
                });
                gameState[room].repeated_roll += 1;
            } else {
                gameState[room].repeated_roll = 0;
                gameState[room].state = "activation";

                io.to(room).emit("square activation",{
                    token : token
                });
                
            }
            console.log(gameState[room]);
        }
    });

    socket.on("finish turn",function(msg){
        if((gameState[room].state == "activation")&&
        isPlayingToken(token,room)){
            var next_player = (gameState[room].current_player+1)%gameState[room].player_order.length;
            gameState[room].current_player = next_player;

            /** Change turn */
            io.to(room).emit("turn",{
                token : gameState[room].player_order[next_player]
            });
            /** Change gamestate to rolling */
            gameState[room].state = "rolling";

            console.log(gameState[room]);
        }

    });


    /** Fetch */
    socket.on("draw question",function(msg){

        /**
         * Only fetch if current game state is in activation state
         * Also, check if current player is playing
         */

        if(isPlayingToken(token,room)&&(
            gameState[room].state == "activation"
        )){
            if(gameState[room].player_status[token].question==null){

                var current_question = gameState[room].question_pointer;
                while(gameState[room].taken_questions.has(current_question)){
                    current_question = (current_question+1)%questions.size;
                }
                // Add question to room status
                gameState[room].taken_questions.add(current_question);

                // Change pointer
                gameState[room].question_pointer  = current_question;

                // Add question to player status
                gameState[room].player_status[token].question = current_question;

                // Emit information about the question
                io.to(room).emit("question",{
                    token : token,
                    question_no : current_question,
                    question_text : questions[current_question].question
                });

                // Take question
            } else {

                // Emit information that this player already has a question card
                io.to(room).emit("already has question",{
                    token : token
                });
            }

            console.log(gameState[room]);

        }
        /** Else don't handle */
    })

    /** 
     * Draw answer 
     * Only draw if player is playing
     * Also, change game state to wait for answer
    */
    socket.on("draw answer",function(msg){

        // Get answer
        if(isPlayingToken(token,room)&&isRoomState(room,"activation")){
            if(gameState[room].player_status[token].question!=null){
                var current_answer = gameState[room].key_pointer;
                var current_answer_2 = (current_answer + 1)%answers.length;



                gameState[room].state = "waiting for answer"
                gameState[room].key_pointer =  (current_answer_2+1)%answers.length;
                // Emit answer to all players
                io.to(room).emit("answers",{
                    ans_1 : answers[current_answer],
                    ans_2 : answers[current_answer_2]
                });
            } else {
                io.to("room").emit("no question",{
                    token : token
                });
            }

            console.log(gameState[room]);
        }
    });

    socket.on("answer",function(msg){
        if(isPlayingToken(token,room)&&isRoomState(room,"waiting for answer")){
            if(playerHasQuestion(room,token)){
                var question_no = gameState[room].player_status[token].question;
                if(msg.answer==null){
                    io.to(room).emit("not answering",{
                        token : token
                    });
                } else {
                    if(questions[question_no].answer.includes(msg.answer)){
                        io.to(room).emit("answer true",{
                            token : token
                        });

                        gameState[room].player_status[token].question_answered++;

                    } else {
                        io.to(room).emit("answer false",{
                            token : token
                        })
                    }

                    // Delete question
                    gameState[room].player_status[token].question = null;
                    gameState[room].taken_questions.delete(question_no);
                }

                // Change gamestate to activation again
                gameState[room].state = "activation"

            } else {
                io.to(room).emit("no question",{
                    token : token
                })
            }

            console.log(gameState[room]);
        }
    })


    socket.on('draw reward',function(msg){


        if(gameState[room].player_status.hasOwnProperty(token)){
            if(isPlayingToken(token,room)&&isRoomState(room,"activation")){
                var reward = rewards[gameState[room].reward_pointer];
                gameState[room].player_status[token].money += reward.nominal;
                gameState[room].reward_pointer = (gameState[room].reward_pointer + 1)%rewards.length;

                io.to(room).emit("cash change",{
                    token : token,
                    cash_amount : gameState[room].player_status[token].money
                });

                io.to(room).emit("reward",{
                    token : token,
                    text : reward.text
                });

                console.log(gameState[room]);
            }
        }
    });



}

function registerValidSpectator(socket,token){




}