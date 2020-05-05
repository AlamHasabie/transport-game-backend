# transport-game-backend
NodeJS backend for Transport Game.

## Token request
First, the user needs to request a token for the game. This token acts as an ID for the player. Note that token for a role of player will be issued only if there's only at most three people in a room. Role is either "spectator" or "player". Given below is the parameter of the request, sent with POST to the /game path.
```js
{
    roomname : "room-1",
    username : "dragon-flyer",
    role : "player"
}
```

## Connection
After receiving the token, client should directly connect with the received token. 
'''js
var socket = io('',{
    query : {
        token : token
        }
    });
'''
## Events
### Joining Event
On connection, server emits information about the joining , either a spectator or a player. Below is the event from server-side
**Player joins**
```js
io.to(room).emit("player join",{
    token : token,
    username : username,
    status : roomdataonjoin(room)
})
```

**Spectator joins**
```js
io.to(room).emit('spectator join',{
    token : token,
    username : username
});
```
Note the status. It will be described in the struct session.


### Game Setup Event
#### Start
Client needs to inform server that he is ready to start the game. Server emits this event when all players are prepared and ready to start the game.<br/>
**Client**
```js
io.emit("ready");
```
**Server**
If not all players are ready :
```js
io.to(room).emit("player ready",{
    token : token
})
```
If all players are ready : 
```js
io.to(room).emit("game ready"); 
```

After this emission, no player can join. Spectators can join.

### Status Change Events
Every change in the visible status of a player will be informed.

#### Cash Change
When the amount of a cash changes, then the amount will be announced to all spectators and players.
```js
io.to(room).emit("cash change",{
    token : token,
    cash_amount : gameState[room].player_status[token].money
});
```


### Reward Events
If a client lands on a reward square, it needs to inform the server.
```js
socket.emit("draw reward");
```

Server will return two emits. The first one is the **cash change** event described earlier, and the second one is the following emit.
*Additional reward emit*
```js
io.to(room).emit("reward",{
    token : token,
    text : reward.text
});
```

## Structs
Given below is the structure of data used in the socket:

