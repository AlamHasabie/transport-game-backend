# transport-game-backend
NodeJS backend for Transport Game.




Socket Events and Emits

1. Player Movement : should be sent when a player moves. 

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
