var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/index.html');
});

io.on('connection',(socket)=>{
    console.log("An user connected");
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