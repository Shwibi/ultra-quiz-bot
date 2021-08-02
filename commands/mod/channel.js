// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Guilds = require("../../models/Guilds");
const Message = require(`../../events/message`);
const {
    Cache,
    Err,
    Main
} = require(`../../utils/Utils`);

const CommandName = 'Channel';

const InvalidArgs = `:x: Invalid channel provided! Please mention the channel or write the id of the channel you want to use!`;


class Command extends Message.Event {

    /**
     * Create command
     */
    constructor() {
        super(CommandName);
    }

    /**
     * 
     * @param {Discord.Client} client 
     */
    init(client) {
        if (this.initiated) return;
        this.client = client;
        this.initiated = true;
    }

    /**
     * Call this command using message
     * @param {Discord.Message} message 
     */
    async call(message) {

        if (!this.initiated) return new Err(`Called ${CommandName} command tendril without message initiation!`);

        const args = message.content.split(/\s/);
        const rawCommand = args.shift();

        const channelId = message.mentions.channels.size !== 0 ? message.mentions.channels.first().id : !isNaN(args[0]) ? args[0] : "invalid";
        if(channelId == "invalid") return message.reply(InvalidArgs);
        
        const findChannel = message.guild.channels.cache.find(ch => ch.id == channelId);
        if(!findChannel) return message.reply(InvalidArgs);

        const guildDB = await Guilds.findOne({guildId: message.guild.id});
        if(!guildDB) return message.reply(this.UnknownError);

        const previousDB = await guildDB.get("guildBoardChannel");
        if(previousDB == findChannel.id) return message.reply(`That's... the same channel as before. Please try a different channel next time.`);

        const newId = findChannel.id;
        await guildDB.updateOne({
          guildBoardChannel: newId
        }).then(() => {
          message.channel.send(`✅ Successfully updated guild leaderboard channel to <#${newId}>!`);
        })


    }
}

const instance = new Command();

// Exports
module.exports = {
    name: CommandName.toLowerCase(),
    description: "Set the guild leaderboard channel to send the guild leaderboard in after quizzes end.",
    useName: CommandName,
    ignore: false,
    guildOnly: false,
    aliases: ["boardchannel", "leaderboardchannel", "lbc"],
    permissions: ['SEND_MESSAGES', 'ADMINISTRATOR'],
    cooldown: 3,
    color: '#50E9FF',
    extraFields: [],
    help: `\`<prefix>channel <mention channel/channel ID>\``,
    call: async (message, client) => {
        if (!instance.initiated) instance.init(client);
        instance.call(message);
    }
}