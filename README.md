# transport-game-backend
NodeJS backend for Transport Game.

## Events
### Joining Event
On connection, server emits information about the number of the player, i.e. 1st player, 2nd player etc.<br/>
**Server**
```js
io.to(socketId).emit()
    "player number info",
    {
        "number":2
    }
)
```
### Game Setup Event
#### Start
Client needs to inform server that he is ready to start the game. Server emits this event when all players are prepared and ready to start the game.<br/>
**Client**
```js
io.emit("ready");
```
**Server**
```js
io.emit("game start");
```

#### First Dice Roll
Server receive information about the dice roll of each client.<br/>
**Client**
```js
io.emit("first dice roll",{
    "dice" : 4
})
```

#### Turn information
When all players had emitted their dice, then server will emit information about the turns in an array.T he first element indicates which player moves first, the second is the second player to move etc.<br/>
**Server**
```js
io.emit("turn information",{
    "turns" : [2,3,4,1]
})
```

### Turn
#### Beginning of a turn
In the beginning of every turn, server will emit information about which player will play.<br/>
**Server**
```js
io.emit("turn",{
    "turn" : 2
})

```
#### Player Movement
When the player moves, the server has to be notified.<br/>
**Client**
```js
io.emit("player movement",{
    "player" : 1,
    "destSquare" : 20
})
```
Server sends broadcast with same data to all other players.<br/>
**Server**
```js
io.brodcast("player movement",{
    "player" : 1,
    "destSquare" : 20
})
```

#### Turn End
When a player had finished its turn by moving or doing all of its obligations, it should notify the server.<br/>
**Client**
```js
io.emit("turn ends")
```
The server then will pick the next player to play.

### Money
#### Fund Change
Should be sent whenever the amount of fund a player has changes. 
The player and the change should be sent.<br/>
**Client**
```js
io.emit("fund change",{
    "player" : 1,
    "change" : -20
})
```

Server emits fund held by the player (not the change).<br/>
**Server**
```js
io.emit("fund update",{
    "player" : 1,
    "fund" : 400
});
```
### Question and Keys
#### Landing on Question Space
When a playing player lands on a question space, the server needs to be mentioned.<br/>
**Client**
```js
io.emit("question space")
```
In turn , the server will emit about question if the player doesn't hold any question cards.<br/>
**Server**
```js
io.emit("question",{
    "question_id" : 3,
    "question" : "What is the answer of the universe ?"
)}
```
If player holds a question card, then the socket will send an information that the player holds it already.<br/>
**Server**
```js
io.emit("holds question already");
```
*Note : the description above can be implemented client-side, but it is safer to also do it in server*

#### Landing on Key Space
When a player lands on a key space, it should notify the server.<br/>
**Client**
```js
io.emit("key space").
```
In turn, the server will emit with data containing two keys.<br/>
**Server**
```js
io.emit("key",{
    [{
        "key_id" : 42,
        "answer" : "It's 42"
    },
    {
        "key_id" : 66,
        "answer" : "Nothing"
    }
    ]
})
```

#### Answering
After player had determined the answer, client should notify the server.<br/>
**Client**
```js
io.emit("answer",{
    "key_id" : 66
}
```
Should client decided to not answer, the client should notify the server.<br/>
**Server**
```js
io.emit("no answer")
```
This indicates that client returns the key question cards to the deck.

#### Response of Answer
After answering, server emits information whether the answer is true or false.<br/>
**Server**
```js
io.emit("response",{
    "response" : true
})
```
If player answers correctly, then server will also emit fund change event.
