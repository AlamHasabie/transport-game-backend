const express = require('express');
const app = express();
const path = require('path');
const roomstatepath = "/rooms/";
const fs = require('fs');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var crypto = require("crypto");

// Global gamestate
// First defined as empty object
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
        role : role
    }

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
    console.log(user);
});

http.listen(3000,()=>{
    console.log('listening on 3000');
});


/**Utils */
/**This part is created so that function can be more modular in the future */

function addnewmembertoroom(roomname , role){
    if(role=="player"){
        gameState[roomname].player = gameState[roomname].player + 1;
    } else if (role=="spectator"){
        gameState[roomname].spectator = gameState[roomname].spectator + 1;
    }
}

function createnewroom(roomname){
    let new_room_data = {
        state : 0,
        player : 0,
        spectator : 0,
        player_socket : [],
        spectator_socket : [],
        taken_questions : [],
        player_order : [],
        current_player : null,
        event_pointer : 0,
        reward_pointer : 0,
        key_pointer : 0,
        question_pointer : 0,
        player_status : []
    }

    gameState[roomname] = new_room_data;
}

function addnewplayerstatus(roomname){
    let new_player_data = {
        money : 0,
        square : 0,
        question_card_held : null
    }

    gameState[roomname].player_status.push(new_player_data);
}