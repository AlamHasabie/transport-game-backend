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

    // Get player event
    // Emit to all players
    socket.on('player movement',(data)=>{
        io.emit('player movement',data);
    })
});

http.listen(3000,()=>{
    console.log('listening on 3000');
});