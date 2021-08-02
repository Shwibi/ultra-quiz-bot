// const guildBoardEmbed = new Discord.MessageEmbed()
// .setTitle("Guild board")
// .setColor("RANDOM")
// .setTimestamp()
// .setFooter(`Total users: ${GBsortedByCorrect.length}`);
// const maxGB = GBsortedByCorrect.length < 11 ? sortedByCorrect.length : 10;
// for (let lbgGB = 0; lbgGB < maxGB; lbgGB++) {
// const userId = GBsortedByCorrect[lbgGB].userId;
// const user = this.client.users.cache.find(u => u.id == userId) || message.guild.members.cache.find(u => u.id == userId);
// guildBoardEmbed.addField(`Rank ${lbgGB + 1}. ${user.username}`, `<@${userId}> Correct: ${GBsortedByCorrect[lbgGB].count} | Time: ${GBsortedByCorrect[lbgGB].time / 1000} second(s)`);
// if (lbgGB == 0) {
//   guildBoardEmbed.setThumbnail(user.avatarURL());
// }
// }

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

const CommandName = 'LeaderBoard';

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

    let GBsortedByCorrect;
    if (!globa.leaderboards || !global.leaderboards[message.guild.id]) {
      GBsortedByCorrect = await Guilds.findOne({
        guildId: message.guild.id
      });
      if (!GBsortedByCorrect) return message.reply(this.UnknownError);
    } else GBsortedByCorrect = global.leaderboards[message.guild.id];

    const guildBoardEmbed = new Discord.MessageEmbed()
      .setTitle("Guild board")
      .setColor("RANDOM")
      .setTimestamp()
      .setFooter(`Total users: ${GBsortedByCorrect.length}`);
    const maxGB = GBsortedByCorrect.length < 11 ? GBsortedByCorrect.length : 10;
    for (let lbgGB = 0; lbgGB < maxGB; lbgGB++) {
      const userId = GBsortedByCorrect[lbgGB].userId;
      const user = this.client.users.cache.find(u => u.id == userId) || message.guild.members.cache.find(u => u.id == userId);
      guildBoardEmbed.addField(`Rank ${lbgGB + 1}. ${user.username}`, `<@${userId}> Correct: ${GBsortedByCorrect[lbgGB].count} | Time: ${GBsortedByCorrect[lbgGB].time / 1000} second(s)`);
      if (lbgGB == 0) {
        guildBoardEmbed.setThumbnail(user.avatarURL());
      }
    }

    message.channel.send(guildBoardEmbed);

  }
}

const instance = new Command();

// Exports
module.exports = {
  name: CommandName.toLowerCase(),
  description: CommandName,
  useName: CommandName,
  ignore: false,
  guildOnly: false,
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  cooldown: 3,
  color: 'RANDOM',
  extraFields: [],
  help: CommandName,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}