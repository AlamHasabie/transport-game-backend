var io;



function init(io_in){

    io = io_in;
}


function sendstate(room,context){

    if(room.start_time!=null){
        let current_time = new Date();
        let diff = current_time - room.start_time;
        room.time_left 
    }

    let timeout = room.timeout_id;
    let roomname = room.roomname;

    delete room.timeout_id;
    io.to(roomname).emit("update",{
        context : context,
        game_status : room
    });

    room.timeout_id = timeout;
    
    return room;
}


module.exports = {
    init: init,
    sendstate: sendstate
}

