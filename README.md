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
After receiving the token, client should directly connect with the received token. Connect to the url with path (for example , 132.423.422.1:3000 or just pass an empty string should the server is hosted locally.
```js
var socket = io('',{
    query : {
        token : token
        }
    });
```

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
    answer : "B"
})
```
### Equipment
After each turn (except when landed in service), player would be offered a chance to use their equipment, if there is any.
There will be **equipment_offer** context sent. To use an equipment, the player sends the following emit :
```js
io.emit("equipment",{
    equipment : 3,
    target_token : "abe62910f"
})
```
equipment field is the card id in the stack. Target token should be filled if the equipment will be used against other, but can be emptied for some (example is roll equipment). If the user does not want to use the offer, he can simply put **null** into the equipment field.<br>
There will be a timeout , and the server will decide the next player.<br>
There are several possible outcomes from the equipment use. If the equipment used is to take an answer, then the server will emit key context instead of equipment use, and the player should send the answer as usual. If the equipment is roll again, then a roll again context will be sent, in which the player should roll before timeouts.

#### Shielding
If the targeted player has a shield(eiter cancel/reverse), the a shield offer emit would be sent. In that case, the targeted player should reply as the following :
```js
io.emit("shield",{
    equipment : 2
})
```
If valid, then the card effect is either cancelled or reversed. Should the player does not want to use its shield, he could simply put **null** into the equipment field.


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

## States
"prepare" : 0, Players are preparing <br>
"ready" : 1, Game is ready, waiting for first roll <br>
"rolling" : 2, The current player rolls <br>
"activation" : 3, Activating thr current square <br>
"answer_wait" : 4, Waiting for answer <br>
"treasure_wait" : 5, Waiting to answer treasure <br>
"equipment_use" : 6, After activation, check if player has equipment <br>
"equipment_offer" : 7, Waiting for player to activate its equipment <br>
"reflect" : 8, **Deprecated** <br>
"equipment_activate" : 9, Activate equipment <br>
"finished" : 10, Turn finished. <br>
"skipeed" : 11, Skipped player.**Deprecated**.<br>
"ended" : 12, game ended.<br>
"player_empty" : 13, there's no more player in the game.<br>
"roll_received" : 14, Roll received, deferred roll handling.<br>
"roll_again" : 15, Roll again.<br>
"equipment_answer" : 16, **Deprecated**.<br>
"shield_offer" : 17 , waiting for targeted player to use his shield.<br>

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
16. answer_true : sent when the answer of a player is true
17. answer_false : sent when the answer of a player is false
18. no_answer : sent when the player does not answer. 
19. coupon_use : sent when a player lands in service but has a coupon.
20. equipment_full : sent when a player gets an equipment, but it has maximum number of equipments being held
21. equipment_offer : sent when a player is offered to use an equipment
22. equipment_use : sent when an equipment is used.
23. shield_offer : sent when the targeted player has a shield and is offered to use it
24. shield_activated : sent when a targeted player activates its shield
25. cancel : notifies that current used equipment effect is cancelled due to the shield
26. no_equipment : sent when the offered player does not use his equipment

Note that contexts are registered within every "update" event emit of the socket.

### gameState
- state : one of the state in the constant.json valid state
- dice_1 : the first dice rolled
- dice_2 : the second dice rolled
- player : number of player
- spectator : Set of spectators
- player_ready : Set of player not ready yet
- roll_wait : Set of player who hasn't rolled the first dice
- taken_questions : Set of taken questions
- skipped : Set of skipped players
- first_roll : Array to save the first roll dice, used to create order of the turns.
- player_order : Order of player for every turn as an array. Contains tokens of players
- taken_event_cards : Event cars held by players
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
- from_token : owner of the executed equipment
- target_token : target of the executed equipment
- equipment_used : id of the card of used equipment in execution
- reply_equipment : id of the card of the shield equipment in execution
- is_equipment_used : used just for indicator for rolling and answer_wait state after equipment execution
- start_time : time when the game starts
- game_timeout : game finish timeout
- time_left : time left of the game , in milliseconds

### player_status
- money : money
- square : which square the player is in
- question_answered :questions owned by user, represented as an array
- held_question : question currently held by player. null if no question is held.
- coupons : coupon for services held by user.
- equipment : equipment cards held by player
- equipment
### question (in player_status)


Examples :
```js
{
    state : 1,
    player : 3,
    dice_1 : 3
    dice_2 : 4,
    spectator : Set{"SFWWFWG2352", "SFDFR54634EGE", "SFWFER674"},
    taken_questions : Set{0,4,5},
    skipped : Set{"PFFWFBH3333"},
    taken_event_cards : Set{0,2},
    player_order : ["PFFWFBH3333","P35252","P252c2cec"],
    current_player : 3,
    event_pointer : 4,
    reward_pointer : 10,
    key_pointer : 8,
    question_pointer : 9,
    repeated_roll : 0,
    answers_drawed : 0,
    answer : null,
    from_token : null,
    target_token : null,
    equipment_used : null,
    reply_equipment : null,
    is_equipment_used : false,
    start_time : Date(),
    game_timeout : 5000000,
    time_left : 40000,
    player_status : {
        "PFFWFBH3333" : {
            username : "Kucing",
            money : 100,
            square : 25,
            coupons : [0]
            equipment : [],
            shield : [],
            questions_answered : [0]
            held_question : null
        "P35252" : {
            username : "Kia",
            money : 100,
            square : 25,
            coupons : [],
            equipment : [],
            shield : [2]
            questions_answered : [4],
            held_question : 5,
        }
        P252c2cec : {
            username : "Telo",
            money : 100,
            coupons : [],
            equipment : [],
            shield : [],
            square : 39,
            questions_answered : [],
            held_question : null,
        }
    }
}
```


## Game Master
Game Master should be registered before being able to change game state, with the following post request to /gm path.
```json
{
    "username" : "username",
    "password" : "password",
    "room" : "room"
}
```
The gamemaster would then receive a token for the socket handshake

The following are event valid for the game master :
1. Finish the game
```js
io.emit("finish");
```

2. Change the timeout. Put the new timeout in milliseconds unit.
```js
io.emit("timeout change",{
    timeout : 45000000
})
```
Note that timeout will be change only when the new timeout is bigger than current gametime or the game has not started yet. An emit with game_timeout_change context will be sent.
