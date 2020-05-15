var io;



function init(io_in){

    io = io_in;
}


function sendstate(room,context){

    let timeout = room.timeout_id;
    let roomname = room.roomname;

    delete room.timeout_id;

    console.log("Send context : " + context);
    io.to(roomname).emit("update",{
        context : context,
        game_state : room
    });

    room.timeout_id = timeout;
    
    return room;
}


module.exports = {
    init: init,
    sendstate: sendstate
}

