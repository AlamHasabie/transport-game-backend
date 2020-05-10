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
const board = require('./assets/board.json');
const timeoutLength = 1000;

const validState = {
    prepare : 0,
    ready : 1,
    rolling : 2,
    activation : 3,
    answer_wait : 4,
    finished : 5
}

const validSquare = {
    start : "start",
    empty : "empty",
    question : "question",
    key : "key",
    event : "event",
    treasure : "treasure",
    reward : "reward",
    service : "service"
}

const validContext = {
    spectator_join : "spectator join",
    player_join :"player join",
    player_ready : "player ready",
    player_leave : "player leave",
    game_ready : "game_ready",
    game_start : "game_start",
    move : "move",
    reward : "reward",
    question : "question",
    key : "key",
    treasure : "treasure",
    event : "event",
    service : "service",
    turn : "turn"
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

            if(isRoomState(room,validState.prepare)){

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



function registerValidPlayer(socket,token){

    var user = userInfo[token];
    var room = user.roomname;
    var username = user.username;

    /** Join socket to room */
    socket.join(room);


    addnewplayertoroom(room,token);
    
    /** Add to ready queue */
    gameState[room].player_ready.add(token);


    io.to(room).emit("player join",{
        context : validContext.player_join,
        token : token,
        username : username,
        game_status : gameState[room]
    })


    /**
     *  GAME SETUP PROCEDURE
     */
    socket.on('ready',function(msg){
        if(gameState[room].state == validState.prepare){
            gameState[room].player_ready.delete(token);

            io.to(room).emit("player ready",{
                context : validContext.player_ready,
                token : token,
                game_status : gameState[room]
            })

            // Add to turn determination list
            gameState[room].roll_wait.add(token);

            if(gameState[room].player_ready.size==0&&gameState[room].player>=2){

                // Delete player_ready element
                delete gameState[room].player_ready;

                // Set to game ready
                gameState[room].state = validState.ready;
                sendcurrentstatedata(room,validContext.game_ready); 
            }
        }
    });

    socket.on("first roll",function(msg){
        if(isRoomState(room,validState.ready)){
            gameState[room].roll_wait.delete(token);

            // Get dice number
            var dice = msg.dice_1 + msg.dice_2;

            gameState[room].first_roll.push({
                token : token,
                dice : dice
            });

            if(gameState[room].roll_wait.size == 0){
                startgame(room);   
            }
        }
    });

    /**
     * TURN PROCEDURE
     */


    socket.on("roll",function(msg){
        if(isRoomState(room,validState.rolling)&&
        isPlayingToken(token,room)){
            var dice_1 = msg.dice_1;
            var dice_2 = msg.dice_2;


            var movement = msg.dice_1 + msg.dice_2;
            var tosquare = (gameState[room].player_status[token].square + movement)%40;
            gameState[room].player_status[token].square = tosquare;



            // Check if dice is same
            // If same, then ask to roll again
            if((dice_1==dice_2)&&(gameState[room].repeated_roll<=2)){
                // State not changed
                gameState[room].repeated_roll += 1;
                sendcurrentstatedata(room,validContext.move);
                setTimeout(sendcurrentstatedata,timeoutLength,room,validContext.turn);
            } else {

                /** Moving to square activation state */
                gameState[room].repeated_roll = 0;
                gameState[room].state = validState.activation;
                sendcurrentstatedata(room,validContext.move);
                setTimeout(activatesquare,timeoutLength,room,token);
                
            }
        }
    });

    /**
     *  QUESTION AND ANSWER PROCEDURE
     */

    socket.on("draw answer",function(msg){

        // Get answer
        if(isPlayingToken(token,room)&&isRoomState(room,validState.activation)){
            if(gameState[room].player_status[token].question!=null){
                var current_answer = gameState[room].key_pointer;
                var current_answer_2 = (current_answer + 1)%answers.length;



                gameState[room].state = validState.answer_wait
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
        if(isPlayingToken(token,room)&&isRoomState(room,validState.answer_wait)){
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
                gameState[room].state = validState.activation;

            } else {
                io.to(room).emit("no question",{
                    token : token
                })
            }

            console.log(gameState[room]);
        }
    });


    /** Disconnect 
     * When a user leaves, then thing needs to be undone
    */
    socket.on("disconnect",function(msg){
        switch (gameState[room].state) {
            case validState.prepare:

                delete gameState[room].player_status[token];
                gameState[room].player_ready.delete(token);
                gameState[room].roll_wait.delete(token);

                io.to(room).emit("player leaves",{
                    token : token
                })


                gameState[room].player--;

                emitplayerleaves(room,token);

                // If player ready becomes zero, then kickstart the game earlier.
                if(gameState[room].player_ready.size==0&&gameState[room].player>=2){

                    // Delete player_ready element
                    delete gameState[room].player_ready;
    
                    // Set to game ready
                    gameState[room].state = validState.ready;
                    sendcurrentstatedata(room,validContext.game_ready); 
                }
                break;

            case validState.ready:

                gameState[room].first_roll = gameState[room].first_roll
                    .filter(function(item){return item != token});

                gameState[room].roll_wait.delete(token);
                delete gameState[room].player_status[token];

                gameState[room].player--;            
                emitplayerleaves(room,token);

                if(gameState[room].roll_wait.size == 0){
                    startgame(room);   
                }
                break;

            case validState.rolling:

                releasequestion(room,token);

                var thistokenplaying = isPlayingToken(token,room)
                delete gameState[room].player_status[token];
                deletefromplayerorder(room,token);
                gameState[room].player--;

                emitplayerleaves(room,token);

                if(thistokenplaying){
                    sendcurrentstatedata(room,validContext.turn);
                }

                break;

            case validState.answer_wait:
            case validState.activation:

                releasequestion(room,token);
                var thistokenplaying = isPlayingToken(token,room)
                delete gameState[room].player_status[token];
                deletefromplayerorder(room,token);
                gameState[room].player--;

                emitplayerleaves(room,token);

                if(thistokenplaying){
                    gameState[room].state = validState.rolling;
                    sendcurrentstatedata(room,validContext.turn);
                }

                break;
        
            default:

                break;
        }


        console.log(gameState[room]);

        deleteroomifempty(room);
    });


    console.log(gameState[room]);




}

function registerValidSpectator(socket,token){

    var user = userInfo[token];
    var room = user.roomname;

    socket.join(room);
    gameState[room].spectator.add(token);


    socket.on("disconnect",function(msg){
        gameState[room].spectator.delete(token);
    });
}


/** UTILS */

function createnewroom(roomname){
    let new_room_data = {
        state : validState.prepare,
        player : 0,
        spectator : new Set(),
        player_ready : new Set(),
        roll_wait : new Set(),
        taken_questions : new Set(),
        skipped : {},
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

function buildturnorder(roomname){

    for(var i = 0 ; i < gameState[roomname].player ; i++){
        console.log(gameState[roomname].first_roll);
        current_max_dice = 0;
        current_index = 0;
        for(var k = 0; k < gameState[roomname].first_roll.length ; k++){
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
    return token == gameState[room].player_order[gameState[room].current_player];
}

function isRoomState(room,state){
    return gameState[room].state == state;
}

function playerHasQuestion(room,token){
    return gameState[room].player_status[token].question != null;
}

function addnewplayertoroom(room,token){
    gameState[room].player_status[token] = {
        money : 150,
        square : 0,
        question : null,
        question_answered : 0
    }
}

function releasequestion(room,token){
    if(gameState[room].player_status[token].question!=null){
        gameState[room].taken_questions.delete(gameState[room].player_status[token].question);
        gameState[room].player_status[token].question = null;
    }

}

function deletefromplayerorder(room,token){

    // Get next available token
    var cur_play = gameState[room].current_player;
    var size = gameState[room].player_order.length;
    var next_tok;
    if(isPlayingToken(token,room)){
        next_tok = gameState[room].player_order[(cur_play+1)%size];
    } else {
        next_tok = gameState[room].player_order[cur_play];
    }

    // Delete element
    gameState[room].player_order
        .filter(function(item){return item!=token});

    // Set current player to the next_tok
    var index = gameState[room].player_order.indexOf(next_tok);
    gameState[room].current_player = index;
}

function deleteroomifempty(room){
    if(gameState[room].player==0&&gameState[room].spectator.size==0){
        delete gameState[room];
    }
}

function sendcurrentstatedata(room,context){
    console.log(gameState[room]);
    io.to(room).emit("update",{
        context : context,
        game_status : gameState[room]
    })
}


/** Update question to the playing user */
/** If user quits during timeout, then do nothing */

function addquestiontouser(room,token){
    if(isPlayingToken(token,room)){
        if(!playerHasQuestion(room,token)){

            var current_question = gameState[room].question_pointer;
            while(gameState[room].taken_questions.has(current_question)){
                current_question = (current_question+1)%questions.length;
            }
            // Add question to room status
            gameState[room].taken_questions.add(current_question);

            // Change pointer
            gameState[room].question_pointer  = current_question;

            // Add question to player status
            gameState[room].player_status[token].question = questions[current_question];

            /** Update */
            sendcurrentstatedata(room,validContext.question);
        }
    }
}

function activatesquare(room,token){
    
    /** Check if still playing
     * Otherwise maybe the player has left during timeouts
     */

    if(isPlayingToken(token,room)&&isRoomState(room,validState.activation)){
        var position = gameState[room].player_status[token].square;
        switch(board[position]){
            case validSquare.question :
                
                addquestiontouser(room,token);

                /** Finish turn with timeout */
                finishturn(room,token);
                break;

            case validSquare.key :


                giveKey(room,token);
                break;

            case validSquare.reward :

                giveReward(room,token);

                /** Timeout */
                finishturn(room,token);

                break;

            case validSquare.event :


                giveEvent(room,token);
                break;

            case validSquare.treasure :

                giveTreasure(room,token);
                break;

            case validSquare.service :

                service(room,token);

                /** Timeout */
                finishturn(room,token);

                break;

            case validSquare.start :
            case validSquare.empty :

                /** No timeout */
                finishturn(room,token);
                break;
        }
    }
}


function finishturn(room,token){

    /** Check if current playing token is still playing */
    /** Otherwise, it might have left the room during the timeout */

    if(isPlayingToken(token,room)){
        var next_player = (gameState[room].current_player+1)%gameState[room].player_order.length;
        gameState[room].current_player = next_player;
    
        /** Change gamestate to rolling */
        gameState[room].state = validState.rolling;
    
        sendcurrentstatedata(room,validContext.turn);
    }
}


function giveReward(room,token){
    var reward = rewards[gameState[room].reward_pointer];
    gameState[room].player_status[token].money += reward.nominal;
    gameState[room].reward_pointer = (gameState[room].reward_pointer + 1)%rewards.length;


    sendcurrentstatedata(room,validContext.reward);
}

function service(room,token){
    gameState[room].skipped[token] = true;
    gameState[room].player_status[token].money -= 15;

    sendcurrentstatedata(room,validContext.service);
}

function giveEvent(room,token){
    sendcurrentstatedata(room,validContext.event);
    finishturn(room,token);
}

function giveKey(room,token){

    sendcurrentstatedata(room,validContext.key);
    finishturn(room,token);

}

function giveTreasure(room,token){
    sendcurrentstatedata(room,validContext.treasure);
    finishturn(room,token);
}

function emitplayerleaves(room,token){
    io.to(room).emit("update",{
        context : validContext.player_leave,
        token : token,
        game_status : gameState[room]
    })
}

function startgame(room){
    gameState[room].state = validState.rolling;
    buildturnorder(room);

    gameState[room].current_player = 0;

    gameState[room].repeated_roll = 0;

    delete gameState[room].roll_wait;

    sendcurrentstatedata(room,validContext.game_start);
    sendcurrentstatedata(room,validContext.turn);
}