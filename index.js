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


    // Player movement

    socket.on('player movement',(data)=>{
        console.log(data)
        io.broadcast('player movement',data);

    })
    socket.on('player position',(data)=>{
        console.log(data);
        io.emit('player position',data);
    });
});

http.listen(3000,()=>{
    console.log('listening on 3000');
});