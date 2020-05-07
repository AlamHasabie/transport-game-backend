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


global.gameState = {};

// Mapping from token to user information
// User information includes :
// username , gameroom , role in the designated game room
global.userInfo = {};


app.use(bodyParser.urlencoded());
app.get('/',(req,res)=>{
    res.render('index.ejs');
});
// For testing purpose only
app.set('view engine', 'ejs');


/** To join a room , simply send a post request with username, room-name and spectator */
/** Username had to be unique for all users */

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


/** To join a room , simply send a post request with room-name and spectator*/
/** The page should directly call for socket joining*/
/** Assume that only validated user would be able to connect to the application , */
/** Means that the room exists */
io.on('connection',(socket)=>{

    var token = socket.handshake.query.token;

    /** TODO : Establish one-to-one relationship between token and socket.id 
     * If an event comes , but the current socket id does not own the token.
     * reject as it is an unauthorized socket.
    */

    // If token is unknown, force close the connection
    if(!userInfo.hasOwnProperty(token)){
        socket.disconnect();
        return;
    }
    var user = userInfo[token];
    var room = user.roomname;
    var username = user.username;
    var role = user.role;

    
    /** Join to room */
    socket.join(room);


    if(role=="player"){

        /** Illegal entry */
        /** Now server crashes when someone refresh the page */
        /** So this return hasn't worked yet :( */
        if(!gameState[room].state== "prepare"){
            socket.disconnect();
            return;
        }
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
                    gameState[room].state == "rolling"

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
                        token : token
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
                    dice_1 = msg.dice_1,
                    dice_2 = msg.dice_2
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

                    io.to(room).emit("square activation");
                }
            }
        });

        socket.on("finish turn",function(msg){
            if((gameState[room].state == "activation")&&
            isPlayingToken(token,room)){
                var next_player = (gameState[room].current_player+1)%gameState[room].player_order.size;
                gameState[room].current_player = next_player;
    
                io.to.emit("turn",{
                    token : token
                });
            }

        });


        socket.on('draw reward',function(msg){


            if(gameState[room].player_status.hasOwnProperty(token)){
                // TODO : Check if this player has the turn
                // TODO : Check if game state is playing

                //if(global.gameState[room].current_player == token){
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
                }
            //}
            // Else ignore the invalid request (not from current player)
        });

    } else if (role=="spectator") {
        io.to(room).emit('spectator join',{
            token : token,
            username : username
        });
        // TODO : Send data about current game state to user
        
    } else {
        /** Illegal request */
        /** Terminate */
        socket.disconnect();
        return;
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
        current_max_dice = 0;
        current_index = 0;
        for(var k = 0; k < gameState[roomname].length ; k++){
            if((gameState[roomname].first_roll[k].dice>current_max_dice)){
                current_max_dice = gameState[roomname].first_roll[k].dice;
                current_index = k;    
            }
        }

        // Get taken token
        var token = gameState[roomname].first_roll[k].token;

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