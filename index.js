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
    var user = userInfo[token];
    var room = user.roomname;
    var username = user.username;
    var role = user.role;

    /** Join to room */
    socket.join(room);

    /** Add information regarding the user */
    gameState[room].player_status[token] = {
        money : 150,
        square : 0,
        question : null,
        question_answered : 0
    }

    /** Add token to player ready set */
    gameState[room].player_ready.add(token);


    
    if(role=="player"){
        io.to(room).emit("player join",{
            token : token,
            username : username,
            status : gameState[room].player_status[token]
        })
    } else {
        io.to(room).emit('spectator join',{
            token : token,
            username : username
        });
    }

    socket.on('ready',function(msg){
        if(gameState[room].state == "prepare"){
            gameState[room].player_ready.delete(token);

            // Add to turn determination list
            gameState[room].player_order.push(token);
            if(gameState[room].player_ready.size==0){
                gameState[room].state = "ready";
                io.to(room).emit("game ready"); 
                console.log(gameState[room]);
            } else {
                io.to(room).emit("player ready",{
                    token : token
                })
            } 
        }
    });

    /** Second step, when game is in ready state */
    /** Assume legal actions taken by all clients */
    /** We can fix this one later */


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
    })

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
        taken_questions : new Set(),
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