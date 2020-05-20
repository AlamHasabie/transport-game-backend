const express = require('express');
const app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var crypto = require("crypto");

/** Assets library  */
const board = require('./assets/board.json');
const validConstants = require('./constants.json');

/** Modules */
const question_module = require('./modules/question_module');
const room_module = require("./modules/room_module");

/** Config */
const config = require("./config.json");
const gamemaster = require('./assets/gm.json');
const delayLength = config.delay;
const timeoutLength = config.timeout;
const answerTimeoutLength = config.answer_timeout
const treasureAnswerTimeoutLength = config.treasure_timeout;
const equipmentTimeoutLength = config.equipment_use_timeout;
const treasure = require("./assets/treasure.json");
const validState = validConstants.validState;
const validSquare = validConstants.validSquare;
const validContext = validConstants.validContext;

global.gameState = {};
global.userInfo = {};


app.use(function(req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  
});

/** This is for testing purpose only */
app.use(bodyParser());

/** CORS */

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
        res.send({
            token : id
        })

    } else {
        res.status(403);
    }


})

app.get('/reconnect/:token',(req,res)=>{
    res.render('reconnect',{
        token : req.params.token
    })
})

app.set('view engine', 'ejs');
app.post('/game',(req,res)=>{

    var roomname = req.body["room"];
    var role = req.body["role"];
    var username = req.body["username"];
    if(!((role=="player")||(role=="spectator"))){
        res.statusCode = 403;
        res.send("Forbidden");

        return;
    } 
    
    if(gameState.hasOwnProperty(roomname)){
        if(role=="player"&&gameState[roomname].player>=4){
            res.statusCode = 403;
            res.send("Forbidden");
            return;
        }

    } else {
        createnewroom(roomname);
    }
    
    var id = crypto.randomBytes(20).toString('hex');
    while(userInfo.hasOwnProperty(id)){
        id = crypto.randomBytes(20).toString('hex');
    }
    
    userInfo[id] = {
        roomname : roomname,
        role : role,
        username : username
    }
    if(role=="player"){
        gameState[roomname].player++;
    }

    res.statusCode = 200;
    res.send({
        token : id
    });
});

app.post('/test',(req,res)=>{
    
    var roomname = req.body["room"];
    var role = req.body["role"];
    var username = req.body["username"];
    if(!((role=="player")||(role=="spectator"))){
        res.statusCode = 403;
        res.send("Forbidden");

        return;
    } 
    
    if(gameState.hasOwnProperty(roomname)){
        if(role=="player"&&gameState[roomname].player>=4){
            res.statusCode = 403;
            res.send("Forbidden");
            return;
        }

    } else {
        createnewroom(roomname);
    }
    
    var id = crypto.randomBytes(20).toString('hex');
    while(userInfo.hasOwnProperty(id)){
        id = crypto.randomBytes(20).toString('hex');
    }
    
    userInfo[id] = {
        roomname : roomname,
        role : role,
        username : username
    }
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

            
            // Reconnect before game ended
            if(gameState[room].player_status.hasOwnProperty(token)&&
            !isRoomState(room,validState.ended)){                                
                registerPlayerEvent(socket,token);
            } else {
                if(isRoomState(room,validState.prepare)){
                    registerNewPlayer(socket,token);
                } else {
                    // Invalid rejoining
                }
            }
        } else if (role=="spectator") {
            registerValidSpectator(socket,token);
        } else if (role=="gamemaster"){
            registerValidGameMaster(socket,token);
        } else {
            console.log("Role unknown, illegal argument");
            socket.disconnect;
        }
    }
});

/** Event Handler Module */
const emitter = require("./modules/emitter");
const questionHandler = require("./modules/question_module");
const rewardHandler = require("./modules/reward_module");
const rollHandler = require("./modules/roll_module");
const answerHandler = require("./modules/answer_module");
const treasureHandler = require("./modules/treasure_module");
const playerLeaveHandler = require("./modules/player_leaves_module");
const eventHandler = require("./modules/event_module");
const serviceHandler = require("./modules/service_module");


emitter.init(io);

serviceHandler.init(emitter);
questionHandler.init(emitter);
rewardHandler.init(emitter);
rollHandler.init(emitter);
answerHandler.init(emitter);
treasureHandler.init(emitter);
playerLeaveHandler.init(emitter);
eventHandler.init(emitter);
room_module.init(emitter);


http.listen(3000,()=>{
    console.log('listening on 3000');
});


function registerNewPlayer(socket,token){

    var user = userInfo[token];
    var room = user.roomname;

    socket.join(room);
    addnewplayertoroom(room,token);
    gameState[room].player_status[token] =
        serviceHandler.addFieldToPlayer(gameState[room].player_status[token]);
    gameState[room].player_status[token] = 
        eventHandler.addFieldToPlayer(gameState[room].player_status[token]);
    gameState[room].player_ready.add(token);
    registerPlayerEvent(socket,token);
}

function registerPlayerEvent(socket,token){
    let user = userInfo[token];
    let room = user.roomname;

    socket.join(room);
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
    });
    socket.on("equipment",function(msg){
        handleEquipmentUseEvent(room,token,msg);
    });
    socket.on("disconnect",function(msg){
        handleDisconnectEvent(room,token,msg);
    });

    sendcurrentstatedata(room,validContext.player_join);

}

function handleDisconnectEvent(room,token,msg){
    gameState[room] = playerLeaveHandler.handle(gameState[room],token);
    sendcurrentstatedata(room,validContext.player_leave);
    deleteroomifempty(room);
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

    socket.on("disconnect",function(msg){
        gameState[room].gamemaster.delete(token);
        deleteroomifempty(room);
    });

    socket.on("finish",function(msg){
        finishGame(room);
    });
}
function createnewroom(roomname){

    gameState[roomname] = room_module.newRoom();
    gameState[roomname].roomname = roomname;
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
        questions_answered : []
    }
}

function deleteroomifempty(room){
    if(gameState.hasOwnProperty(room)){
        if(gameState.hasOwnProperty("player")&&
        gameState.hasOwnProperty("spectator")&&
        gameState.hasOwnProperty("gamemaster")){
            if(gameState[room].player==0&&
                gameState[room].spectator.size==0&&
                gameState[room].gamemaster.size==0){
                delete gameState[room];
                console.log("Room " + room + " is deleted");
            }
        }
    }
}

function sendcurrentstatedata(room,context){
    let timeout = gameState[room].timeout_id;
    delete gameState[room].timeout_id;
    io.to(room).emit("update",{
        context : context,
        game_status : gameState[room]
    });
    gameState[room].timeout_id = timeout;
}

function activatesquare(room,token){
    if(isPlayingToken(token,room)&&isRoomState(room,validState.activation)){
        var position = gameState[room].player_status[token].square;
        switch(board[position]){
            case validSquare.question :
                gameState[room] = questionHandler.handle(gameState[room]);
                addTimeout(useEquipment,delayLength,room,token);
                break;

            case validSquare.key :
                gameState[room] = answerHandler.handle(gameState[room]);
                if(isRoomState(room,validState.answer_wait)){
                    addTimeout(answerTimeout,answerTimeoutLength,room,token);
                } else if(isRoomState(room,validState.equipment_use)) {
                    addTimeout(finishturn,delayLength,room,token);
                }
                break;

            case validSquare.reward :
                gameState[room] = rewardHandler.handle(gameState[room]);
                addTimeout(useEquipment,delayLength,room,token);
                break;

            case validSquare.event :
                gameState[room] = eventHandler.handle(gameState[room]);
                if(isRoomState(room,validState.equipment_use)){
                    addTimeout(useEquipment,delayLength,room,token);
                    break;
                } else if(isRoomState(room,validState.rolling)){
                    addTimeout(timeout,timeoutLength,room,token);
                
                } else {
                    addTimeout(finishturn,delayLength,room,token);
                }

                break;


            case validSquare.treasure :
                gameState[room] = treasureHandler.handle(gameState[room]);
                if(isRoomState(room,validState.equipment_use)){
                    addTimeout(useEquipment,delayLength,room,token);
                } else if (isRoomState(room,validState.treasure_wait)){
                    addTimeout(treasureFail,treasureAnswerTimeoutLength,room,token);
                }
                break;

            case validSquare.service :

                gameState[room] = serviceHandler.handle(gameState[room]);
                addTimeout(finishturn,delayLength,room,token);
                break;

            case validSquare.start :
            case validSquare.empty :
                gameState[room].state = validState.equipment_use;
                useEquipment(room,token);
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
    let next_token;
    if(isRoomState(room,validState.finished)){
        gameState[room].current_player = changetonextplayer(room);
        next_token = gameState[room].player_order[gameState[room].current_player];
        gameState[room].state = validState.rolling;
        sendcurrentstatedata(room,validContext.turn);
        addTimeout(timeout,timeoutLength,room,next_token);
    }
}

function handleReadyEvent(room,token,msg){
    if(isRoomState(room,validState.prepare)){
        gameState[room].player_ready.delete(token);
        sendcurrentstatedata(room,validContext.player_ready);
        gameState[room].roll_wait.add(token);

        if(gameState[room].player_ready.size==0&&gameState[room].player>=config.minimal_player){
            delete gameState[room].player_ready;
            gameState[room].state = validState.ready;
            sendcurrentstatedata(room,validContext.game_ready); 
        }
    }
}

function handleFirstRollEvent(room,token,msg){
    if(isRoomState(room,validState.ready)){
        gameState[room].roll_wait.delete(token);

        let dice = msg.dice_1 + msg.dice_2;
        gameState[room].first_roll.push({
            token : token,
            dice : dice
        });
        if(gameState[room].roll_wait.size == 0){
            gameState[room] = room_module.startGame(gameState[room]);   
            addTimeout(timeout,timeoutLength,room,token);
        }
    }
}

function handleRollEvent(room,token,msg){
    if(rollHandler.validRollEvent(gameState[room],token,msg)){
        clearTimeout(gameState[room].timeout_id);
        gameState[room] = rollHandler.handleRollEvent(gameState[room],token,msg);
        if(isRoomState(room,validState.activation)){
            addTimeout(activatesquare,delayLength,room,token);
        } else if (isRoomState(room,validState.rolling)){
            addTimeout(timeout,timeoutLength,room,token);
        }
    }
}

function handleAnswerEvent(room,token,msg){
    if(answerHandler.validAnswerEvent(gameState[room],token,msg)){
        clearTimeout(gameState[room].timeout_id);
        gameState[room] = answerHandler.handleAnswerEvent(gameState[room],token,msg);
        if(isRoomState(room,validState.equipment_use)){
            addTimeout(useEquipment,delayLength,room,token);
        } else if(isRoomState(room,validState.answer_wait)){
            addTimeout(answerTimeout,answerTimeoutLength,room,token);
        }
    }
}

function handleTreasureAnswerEvent(room,token,msg){

    if(isPlayingToken(token,room)&&
    isRoomState(room,validState.treasure_wait)){
        clearTimeout(gameState[room].timeout_id);
        if(msg.answer==treasure.answer){
            gameState[room].player_status[token].money+=config.treasure_reward;
            gameState[room].state = validState.ended;
            addTimeout(finishGame,delayLength,room,null);
        } else {
            treasureFail(room,token);
        }
    }
}

function handleEquipmentUseEvent(room,token,msg){

    let target_token = msg.target_token;
    let card_user = msg.equipment;

    // Do nothing for now

    // if equipment has no targetor target has no reflector, execute directly
    // else wait for the reflector


}

function finishGame(room){
    sendcurrentstatedata(room,validContext.finish);
    deleteroomifempty(room);
}

/** TIMEOUTS */
function treasureFail(room,token){
    gameState[room].state = validState.equipment_use;
    gameState[room] = question_module.releaseAnsweredQuestions(gameState[room],token);
    sendcurrentstatedata(room,validContext.treasure_failed);
    addTimeout(useEquipment,delayLength,room,token);
}

function answerTimeout(room,token){
    gameState[room].answers_drawed = 0;
    gameState[room].answer = null;
    gameState[room].state = validState.equipment_use;
    sendcurrentstatedata(room,validContext.answer_timeout);
    addTimeout(useEquipment,delayLength,room,token);

}

function timeout(room,token){
    gameState[room].target_token = null;
    gameState[room].equipment_used = null;
    gameState[room].reply_equipment = null;
    gameState[room].state = validState.finished;
    sendcurrentstatedata(room,validContext.timeout);
    finishturn(room,token);
}

function addTimeout(timeout_func,delay,room,token){
    if(token==null){
        gameState[room].timeout_id = setTimeout(
            timeout_func,
            delay,
            room
        );
    }
    else {
        gameState[room].timeout_id = setTimeout(
            timeout_func,
            delay,
            room,
            token
        );
    }
}

function useEquipment(room,token){
    if(gameState[room].player_status[token].equipment.length > 0){
        sendcurrentstatedata(room,validContext.equipment_use);
        addTimeout(timeout,equipmentTimeoutLength,room,token);

    } else {
        gameState[room].state = validState.finished;
        finishturn(room,token);
    }

}
