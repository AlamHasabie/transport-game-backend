var rewards = require("../assets/rewards.json");

function giveReward(roomstate,token){
    var reward = rewards[roomstate.reward_pointer];
    roomstate.player_status[token].money += reward.nominal;
    roomstate.reward_pointer = (roomstate.reward_pointer + 1)%rewards.length;


    return {
        state : roomstate,
        text : reward.text
    }
}

module.exports = {
    giveReward : giveReward
}