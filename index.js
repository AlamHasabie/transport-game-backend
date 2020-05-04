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
    console.log(req.body);
    
    /**Check if game room exist */
    if(gameState.hasOwnProperty(req.body["room"])){

        // Check if there's still room for a new player to join
        if(req.body["role"]=="player"){
            if(gameState[req.body["room"]].player>=4){
                res.statusCode = 403;
                res.send("Forbidden : full gameroom");
            } else {
                gameState[req.body["room"]].player = gameState[req.body["room"]].player + 1;
                res.statusCode = 200;
                res.send("Ok");

            }

        } else if (req.body["role"]=="spectator"){
            gameState[req.body["room"]].spectator = gameState[req.body["room"]].spectator + 1;
            res.statusCode = 200;
            res.send("Ok");
        } else {
            res.statusCode = 400;
            res.send("Bad request , role not defined");
        }

        console.log(gameState);

    } else {

        // Create new room with empty state
        // Reserve the place
        let new_room_data = {
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

        if(req.body["role"]=="spectator"){
            new_room_data.spectator = 1;
        }
        
        if(req.body["player"]=="player"){
            new_room_data.player = 1;
        }

        gameState[req.body["room"]] = empty_data;
        console.log(gameState);
        res.statusCode = 200;
        res.send("Room created");
    }
});


/** To join a room , simply send a post request with room-name and spectator*/
/** The page should directly call for socket joining*/

app.post('/game',(req,res)=>{
    console.log(req.body);
    
    /**Check if game room exist */
    var roomstatefile = path.join(__dirname , roomstatepath, req.body["room"] + ".json");
    fs.access(roomstatefile,(err)=>{
        if(err){
            // Create new room with empty state
            let empty_data = {
                room : req.body["room"],
                members : 0,
                player : 0,
                spectator : 0,
                player_socket : [],
                spectator_socket : [],
                taken_questions : [],
                event_pointer : 0,
                reward_pointer : 0,
                key_pointer : 0,
                player_status : []
            }

            fs.writeFile(roomstatefile,JSON.stringify(empty_data),err=>{
                if(err) return console.log(err);
                res.statusCode = 200;
                res.send("Good !");
            });
        } else {
            // Check if room full
            // Is full , then player role denied entry
            // If
        }

    })
})

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