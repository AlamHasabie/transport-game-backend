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
    game_status : gameState
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
    token : token,
    game_status : gameState
})
```
If all players are ready : 
```js
io.to(room).emit("game ready",{
    game_status : gameState
}); 
```

After this emission, no player can join. Spectators can join.

### Status Change Events
Every change in the visible status of a player will be informed in the "update" event.
```js
io.to(roo).emit("update",{
    context : context,
    game_status : gameState
}
```
Context and gameState struct will be defined below.

## Structs
Given below is the structure of data used in the socket:

### Context
Context sent by server can be seen in the constans.json file, and can be one of the following :
1. spectator_join : sent when a spectator joins
2. player_join : sent when a new player joins. Sent along context is a "token" field of the new user
3. player_ready : sent when a player is ready. Sent along context is a "token" field of the user sending the "ready"
4. player_leave : sent when a player is leaving the room. Sent along is a "token" field of the leaving user.
5. game_ready : sent when all player is ready ; used to notify that server ask for dice (first roll)
6. game_start : sent when the game starts
7. move : sent when the currnet player had moved its position.
8. reward : sent when the current player receives a reward
9. question : sent when the current player receives a question
10. key : sent when the current player is offered a key
11. treasure : sent when the current player is landed on the treasure
12. event : sent when the player lands on the event square
13. service : sent when current player lands on service
14. turn : notify that the playing player should roll the dice. Called after every turn
15. timeout : sent when timeout occurs. It normally should be followed with a turn context, since the next player should play
16. answer_true : send when the answer of a player is true
17. answer_false : send when the answer of a player is false
18. no_answer : send when the player does not answer. 

Note that contexts are registered within every "update" event emit of the socket.

### gameState

