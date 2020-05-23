


function log(room , token, msg){
    console.log(room.roomname + "|" + token + "|  " + msg);
}


module.exports={
    log : log
}