var io;



function init(io_in){

    io = io_in;
}


function sendstate(room,context){

    let roomname = room.roomname;

    io.to(roomname).emit("update",{
        context : context,
        game_state : room
    })
}


module.exports = {
    init: init,
    sendstate: sendstate
}

