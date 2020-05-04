const express = require('express');
const app = express();
const path = require('path');
const roomstatepath = "/rooms/";
const fs = require('fs');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');


app.use(bodyParser.urlencoded());

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');

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