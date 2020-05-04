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

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');

});


/** To join a room , simply send a post request with room-name and spectator*/
/** The page should directly call for socket joining*/

app.post('/game',(req,res)=>{
    console.log(req.body);
    
    /**Check if game room exist */
    if(gameState.hasOwnProperty(req.body["room"])){

        // If role is a player , reserve the place
        console.log(gameState);
        res.statusCode = 200;
        res.send("Room exists");

    } else {

        // Create new room with empty state
        let empty_data = {
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

        gameState[req.body["room"]] = empty_data;
        console.log(gameState);
        res.statusCode = 200;
        res.send("Room created");
    }
});

io.on('connection',(socket)=>{

    
    console.log("An user connected");
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