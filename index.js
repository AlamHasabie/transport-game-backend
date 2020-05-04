const express = require('express');
const app = express();
const path = require('path');
const roomstatepath = "/rooms/";
const fs = require('fs');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

// Global gamestate
// First defined as empty object
global.gameState = {};


app.use(bodyParser.urlencoded());

app.use(bodyParser.urlencoded());

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');

});


/** To join a room , simply send a post request with room-name and spectator*/
/** The page should directly call for socket joining*/

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

        addnewmembertoroom(roomname,role);
        res.statusCode = 200;
        res.send("OK");

    } else {

        createnewroom(roomname);
        if(role=="spectator"){
            gameState[roomname].spectator = 1;
        }
        
        if(role=="player"){
            gameState[roomname].player = 1;
        }

        console.log(gameState);
        res.statusCode = 200;
        res.send("OK. Room created.");
    }
});


/** To join a room , simply send a post request with room-name and spectator*/
/** The page should directly call for socket joining*/
/** Assume that only validated user would be able to connect to the application  */
io.on('connection',(socket)=>{

    

    console.log(socket.id);


    socket.on('chat message',(msg)=>{
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    })
    socket.on('disconnect',()=>{
        console.log("User disconnect");
    });


    /* PLAYER EVENT GROUP */
    // Player movement
    socket.on('player movement',(data)=>{
        // TODO : Update game state
        io.broadcast('player movement',data);

    });
    // Fund change
    socket.on('fund change',(data)=>{
        // TODO : Update game state
        io.broadcast('fund update',{
            "player" : 1,
            "fund" : 400
        });
    });




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
        members : 0,
        player : 0,
        spectator : 0,
        player_socket : [],
        spectator_socket : [],
        taken_questions : [],
        event_pointer : 0,
        reward_pointer : 0,
        key_pointer : 0,
        question_pointer : 0,
        player_status : []
    }

    gameState[roomname] = new_room_data;
}