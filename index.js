const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var crypto = require("crypto");

/** Assets library  */
const questions = require('./assets/questions.json');
const answers = require('./assets/answers.json');
const board = require('./assets/board.json');
const validConstants = require('./constants.json');

/** Modules */
const question_module = require('./modules/question_module');
const rewards_module = require('./modules/reward_module');
const room_module = require("./modules/room_module");

/** Config */
const gamemaster = require('./assets/gm.json');
const timeoutLength = 1000;
const answerTimeoutLength = 10000;
const treasureAnswerTimeoutLength = 30000;

const minimumAnswertoTreasure = -1;
const treasure = require("./assets/treasure.json");


/** Server initialization */
global.gameState = {};
global.userInfo = {};
const validState = validConstants.validState;
const validSquare = validConstants.validSquare;
const validContext = validConstants.validContext;


/** This is for testing purpose only */
app.use(bodyParser.urlencoded());
app.get('/',(req,res)=>{
    res.render('index.ejs');
});
app.get('/gm',(req,res)=>{
    res.render('gm-index.ejs');
});
app.post('/gm',(req,res)=>{

    var username = req.body["username"];
    var password = req.body["password"];
    var roomname = req.body["room"];

    if(gamemaster.username==username&&gamemaster.password==password){

        // Generate
        if(!gameState.hasOwnProperty(roomname)){

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
            role : "gamemaster",
            username : username
        }

        res.statusCode = 200;
        res.render('game',{
            token : id
        });

    } else {
        res.status(403);
    }


})

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
    if(role=="player"){
        gameState[roomname].player++;
    }

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

        } else if (role=="gamemaster"){

            registerValidGameMaster(socket,token);


        } else {
            console.log("Role unknown, illegal argument");
        }
    }
});

const emitter = require("./modules/emitter");
const questionHandler = require("./modules/question_module");
const rewardHandler = require("./modules/reward_module");
const rollHandler = require("./modules/roll_module");
const answerHandler = require("./modules/answer_module");


emitter.init(io);
questionHandler.init(emitter);
rewardHandler.init(emitter);
rollHandler.init(emitter);
answerHandler.init(emitter);

http.listen(3000,()=>{
    console.log('listening on 3000');
});


function registerValidPlayer(socket,token){

    var user = userInfo[token];
    var room = user.roomname;
    var username = user.username;

    /** Join socket to room */
    socket.join(room);
    addnewplayertoroom(room,token);
    
    gameState[room].player_ready.add(token);

    sendcurrentstatedata(room,validContext.player_join);

    socket.on('ready',function(msg){
        handleReadyEvent(room,token,msg);
    });
    socket.on("first roll",function(msg){
        handleFirstRollEvent(room,token,msg);
    });
    socket.on("roll",function(msg){
        handleRollEvent(room,token,msg);
    });
    socket.on("answer",function(msg){
        handleAnswerEvent(room,token,msg);
    });
    socket.on("treasure answer",function(msg){
        handleTreasureAnswerEvent(room,token,msg);
    })


    /** Disconnect 
     * When a user leaves, then thing needs to be undone
    */
    socket.on("disconnect",function(msg){
        var thistokenplaying = isPlayingToken(token,room);
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
                if(gameState[room].player_ready.size==0&&gameState[room].player>=1){

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

                deleteplayerduringgame(room,token);

                if(thistokenplaying){
                    sendcurrentstatedata(room,validContext.turn);
                }

                break;

            case validState.answer_wait:
                delete gameState[room].offered_answer;
                delete gameState[room].timeout_id;

                deleteplayerduringgame(room,token);

                if(thistokenplaying){
                    gameState[room].state = validState.rolling;
                    sendcurrentstatedata(room,validContext.turn);
                }

            case validState.treasure_wait:
                delete gameState[room].treasure;
                delete gameState[room].timeout_id;
                
                deleteplayerduringgame(room,token);

                if(thistokenplaying){
                    gameState[room].state = validState.rolling;
                    sendcurrentstatedata(room,validContext.turn);
                }

            case validState.activation:

                deleteplayerduringgame(room,token);

                if(thistokenplaying){
                    gameState[room].state = validState.rolling;
                    sendcurrentstatedata(room,validContext.turn);
                }

                break;
        
            default:

                break;
        }
        deleteroomifempty(room);
    });


}

function registerValidSpectator(socket,token){

    var user = userInfo[token];
    var room = user.roomname;

    socket.join(room);
    gameState[room].spectator.add(token);
    sendcurrentstatedata(room,validContext.spectator_join);

    socket.on("disconnect",function(msg){
        gameState[room].spectator.delete(token);

        deleteroomifempty(room);
    });
}

function registerValidGameMaster(socket,token){
    var user = userInfo[token];
    var room = user.roomname;

    socket.join(room);
    gameState[room].gamemaster.add(token);
    sendcurrentstatedata(room,validContext.gm_join);

    socket.on("disconnet",function(msg){
        gameState[room].gamemaster.delete(token);

        deleteroomifempty(room);
    });

    socket.on("finish",function(msg){
        finishGame(room);
    })
}

function deleteplayerduringgame(room,token){

    gameState[room] = question_module.releaseQuestions(gameState[room],token);
    delete gameState[room].player_status[token];
    deletefromplayerorder(room,token);
    gameState[room].player--;

    emitplayerleaves(room,token);

}
function createnewroom(roomname){

    gameState[roomname] = room_module.newRoom();
    gameState[roomname].roomname = roomname;
}

function buildturnorder(roomname){

    for(var i = 0 ; i < gameState[roomname].player ; i++){
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

    gameState[roomname].first_roll = null;
}


function isPlayingToken(token,room){
    return token == gameState[room].player_order[gameState[room].current_player];
}

function isRoomState(room,state){
    return gameState[room].state == state;
}

function addnewplayertoroom(room,token){
    gameState[room].player_status[token] = {
        username : userInfo[token].username,
        money : 150,
        square : 0,
        held_question : null,
        questions_answered : new Set(),
        equipment : new Set()

    }
}

function deletefromplayerorder(room,token){

    // Get next available token
    var cur_play = gameState[room].current_player;
    var size = gameState[room].player_order.length;
    var next_tok;
    if(isPlayingToken(token,room)){
        next_tok =  changetonextplayer(room);
    } else {
        next_tok = gameState[room].player_order[cur_play];
    }

    // Delete element
    gameState[room].player_order = gameState[room].player_order
        .filter(function(item){return item!=token});

    // Set current player to the next_tok
    var index = gameState[room].player_order.indexOf(next_tok);
    gameState[room].current_player = index;
}

function deleteroomifempty(room){
    if(gameState[room].player==0&&
        gameState[room].spectator.size==0&&
        gameState[room].gamemaster.size==0){
        delete gameState[room];
    }
}

function sendcurrentstatedata(room,context){
    io.to(room).emit("update",{
        context : context,
        game_status : gameState[room]
    })
}

function activatesquare(room,token){

    if(isPlayingToken(token,room)&&isRoomState(room,validState.activation)){
        var position = gameState[room].player_status[token].square;
        switch(board[position]){
            case validSquare.question :

                gameState[room] = questionHandler.handle(gameState[room]);
                setTimeout(finishturn,timeoutLength,room,token);
                break;

            case validSquare.key :

                gameState[room] = answerHandler.handle(gameState[room]);
                if(isRoomState(room,validState.answer_wait)){
                    gameState[room].timeout_id = setTimeout(
                        answerTimeout,
                        answerTimeoutLength,
                        room,
                        token
                    );
                } else {
                    setTimeout(finishturn,timeoutLength,room,token);
                }
                break;

            case validSquare.reward :

                gameState[room] = rewardHandler.handle(gameState[room]);
                setTimeout(finishturn,timeoutLength,room,token);

                break;

            case validSquare.event :
                giveEvent(room,token);
                break;

            case validSquare.treasure :

                var answered = gameState[room].player_status[token].questions_answered.size;
                if(answered >= minimumAnswertoTreasure){
                    giveTreasure(room,token);
                }else{
                    finishturn(room,token);
                }

                break;

            case validSquare.service :

                service(room,token);
                setTimeout(finishturn,timeoutLength,room,token);
                break;

            case validSquare.start :
            case validSquare.empty :

                finishturn(room,token);
                break;
        }
    }
}

function changetonextplayer(room){
    var valid_player = false;
    var next_player = gameState[room].current_player;
    while(!valid_player){
        next_player = (next_player+1)%gameState[room].player_order.length;
        if(gameState[room].skipped.has(gameState[room].player_order[next_player])){
            gameState[room].skipped.delete(gameState[room].player_order[next_player]);
        } else {
            valid_player = true;
        }
    }
    return next_player;
}

function finishturn(room,token){

    if(isPlayingToken(token,room)&&(isRoomState(room,validState.finished))){
        gameState[room].current_player = changetonextplayer(room);
        gameState[room].state = validState.rolling;
        sendcurrentstatedata(room,validContext.turn);
    }
}

function service(room,token){
    gameState[room].skipped.add(token);
    gameState[room].player_status[token].money -= 15;

    sendcurrentstatedata(room,validContext.service);
}

function giveEvent(room,token){
    sendcurrentstatedata(room,validContext.event);
    finishturn(room,token);
}

function giveTreasure(room,token){

    /** Wait for treasure */
    gameState[room].state = validState.treasure_wait;

    /** Add treasure to gameState */
    gameState[room].treasure = {}
    gameState[room].treasure.question = treasure.question;
    gameState[room].treasure.choices = treasure.choices;

    sendcurrentstatedata(room,validContext.treasure);

    /** Add timeout */
    var timeout_id =  setTimeout(treasureFail,treasureAnswerTimeoutLength,room,token);

    gameState[room].timeout_id = timeout_id;
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

/** Handlers */
function handleReadyEvent(room,token,msg){
    if(isRoomState(room,validState.prepare)){
        gameState[room].player_ready.delete(token);

        io.to(room).emit("update",{
            context : validContext.player_ready,
            token : token,
            game_status : gameState[room]
        })

        // Add to turn determination list
        gameState[room].roll_wait.add(token);

        if(gameState[room].player_ready.size==0&&gameState[room].player>=1){

            // Delete player_ready element
            delete gameState[room].player_ready;

            // Set to game ready
            gameState[room].state = validState.ready;
            sendcurrentstatedata(room,validContext.game_ready); 
        }
    }




}
function handleFirstRollEvent(room,token,msg){
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
}
function handleRollEvent(room,token,msg){
    if(isRoomState(room,validState.rolling)&&
    isPlayingToken(token,room)){
        gameState[room].dice_1 = msg.dice_1;
        gameState[room].dice_2 = msg.dice_2;

        gameState[room] = rollHandler.handle(gameState[room]);
        if(isRoomState(room,validState.activation)){
            setTimeout(activatesquare,timeoutLength,room,token);
        }
    }
}

function handleAnswerEvent(room,token,msg){
    if(isPlayingToken(token,room)&&
    isRoomState(room,validState.answer_wait)&&
    question_module.playerHasQuestion(gameState[room],token)){
        clearTimeout(gameState[room].timeout_id);
        gameState[room].answer = msg.selected;
        gameState[room] = answerHandler.handleAnswerEvent(gameState[room]);

        if(isRoomState(room,validState.finished)){
            setTimeout(finishturn,timeoutLength,room,token);
        } else if(isRoomState(room,validState.answer_wait)){
            setTimeout(answerTimeout,answerTimeoutLength,room,token);
        }
    }
}
function handleTreasureAnswerEvent(room,token,msg){

    if(isPlayingToken(token,room)&&
    isRoomState(room,validState.treasure_wait)){

        clearTimeout(gameState[room].timeout_id);
        
        var answer = msg.answer;
        if(answer==treasure.answer){
            /** Game finished */
            setTimeout(finishGame, timeoutLength, room);
        } else {
            treasureFail(room,token);
        }
    }
}

function finishGame(room){
    gameState[room].state = validState.ended;
    sendcurrentstatedata(room,validContext.finish);
}

// If timeout
function treasureFail(room,token){

    /** Wrong answer or timed out*/
    gameState[room] = question_module.releaseQuestions(gameState[room],token);
    delete gameState[room].timeout_id;

    setTimeout(sendcurrentstatedata,timeoutLength,room,validContext.treasure_failed);
    gameState[room].state = validState.finished;
    setTimeout(finishturn,timeoutLength*2,room,token);
}

function answerTimeout(room,token){
    gameState[room].answers_drawed = 0;
    gameState[room].answer = null;
    timeout(room,token);
}

function timeout(room,token){
    
    gameState[room].state = validState.finished;
    sendcurrentstatedata(room,validContext.timeout);
    finishturn(room,token);
}
