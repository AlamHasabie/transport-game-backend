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

Response
```json
{
    "token" : "token"
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
### Event by Clients
Client should send the following emits :
1. Inform that client is ready
```js
io.emit("ready")
```

2. Inform first roll dice
```js
io.emit("first roll",{
    dice_1 : dice_1,
    dice_2 : dice_2
})
```

3. Roll the dice
```js
io.emit("roll",{
    dice_1 : dice_1,
    dice_2 : dice_2
})
```

4. Answer. Selected should be a boolean
```js
io.emit("answer",{
    selected : true
});
```

4. Treasure answer. Answer is between [A,E]
```js
io.emit("treasure answer",{
    selected : true
})
```



### Status Change Updates
Every change in the visible status of a player will be informed in the "update" event.
```js
io.to(roo).emit("update",{
    context : context,
    game_status : gameState
}
```
Context and gameState struct will be defined below.

## Leaving the Game
Players can sometimes have bad connection, making the socket disconnected. Or maybe they are just a pain in the ass and want to leave the game so he would not lose.
In either case(s), there will be emitted update with player_leave context. However, the game would not decided to end his turn until the next timeout. This is much easier to be implemented in the code.



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
11. treasure : sent when the current player is landed on the treasure. Exists only in treasure_wait state, otherwise deleted
12. event : sent when the player lands on the event square
13. service : sent when current player lands on service
14. turn : notify that the playing player should roll the dice. Called after every turn
15. timeout : sent when timeout occurs. It normally should be followed with a turn context, since the next player should play
16. answer_true : send when the answer of a player is true
17. answer_false : send when the answer of a player is false
18. no_answer : send when the player does not answer. 

Note that contexts are registered within every "update" event emit of the socket.

### gameState
- state : one of the state in the constant.json valid state
- player : number of player
- spectator : Set of spectators
- player_ready : Set of player not ready yet
- roll_wait : Set of player who hasn't rolled the first dice
- taken_questions : Set of taken questions
- skipped : Set of skipped players
- first_roll : Array to save the first roll dice, used to create order of the turns.
- player_order : Order of player for every turn as an array. Contains tokens of players
- offered_answer : answer card currently used
- current_player : current player, as an index of the player order
- event_pointer : points to the event drawed
- reward_pointer : points to the reward drawed
- key_pointer : points to the key card drawed
- question_pointer : points to question card drawed
- repeated_roll : number of consecutive roll-agains. set to 0 by default
- answer_drawed : number of consecutive drawn answers, used during answer_wait state.
- answer : answer by the player during answer_wait state. null in other state.
- player_status : object of player status. Accessible with player token (player_status[token])

### player_status
- money : money
- square : which square the player is in
- question_answered :questions owned by user
- held_question : question currently held by player. null if no question is held.

### question (in player_status)


Examples :
```js
{
    state : 1,
    player : 3,
    spectator : Set{"SFWWFWG2352", "SFDFR54634EGE", "SFWFER674"},
    taken_questions : Set{0,4,5},
    skipped : Set{"PFFWFBH3333"},
    player_order : ["PFFWFBH3333","P35252","P252c2cec"],
    current_player : 3,
    event_pointer : 4,
    reward_pointer : 10,
    key_pointer : 8,
    question_pointer : 9,
    repeated_roll : 0,
    answers_drawed : 0,
    answer : null,
    player_status : {
        "PFFWFBH3333" : {
            username : "Kucing",
            money : 100,
            square : 25,
            questions_answered : [0]
            held_question : null
        "P35252" : {
            username : "Kia",
            money : 100,
            square : 25,
            questions_answered : [4],
            held_question : 5,
        }
        P252c2cec : {
            username : "Telo",
            money : 100,
            square : 39,
            questions_answered : [],
            held_question : null,
        }
    }

}

```


