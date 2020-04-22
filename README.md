# transport-game-backend
NodeJS backend for Transport Game.




## Events


### Player Events
#### Player Movement
Should be sent when a player moves. 
Client
```json
io.emit("player movement",{
    "player" : 1,
    "destSquare" : 20
})
```
Server sends broadcast with same data
```json
io.brodcast("player movement",{
    "player" : 1,
    "destSquare" : 20
})
```

#### Fund Change
Should be sent whenever the amount of fund a player has changes. 
The player and the change should be sent
Client
```json
io.emit("fund change",{
    "player" : 1,
    "change" : -20
})
```

Server emits fund held by the player (not the change)
```json
io.emit("fund update",{
    "player" : 1,
    "fund" : 400
});
```




