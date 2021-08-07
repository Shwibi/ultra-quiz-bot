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
const Start = require("./start");
const { Cache, Err, Main } = require(`../../utils/Utils`);
const Stack = require("shwi-js/Stack/Stack");
const { IsInteger } = require("shwi-js");

const CommandName = "LeaderBoard";

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
    if (!this.initiated)
      return new Err(
        `Called ${CommandName} command tendril without message initiation!`
      );

    const args = message.content.toLowerCase().split(/\s/);
    if (args[1] == "local") {
      const latestBoard = Start.instance.stash[message.guild.id];
      if (!latestBoard)
        return message.channel.send(
          `${this.e.x} No latest quizzes were found!`
        );
      let toSendBoard = latestBoard.top_item;
      if (args[2])
        toSendBoard = latestBoard.item(latestBoard.top - parseInt(args[2]));
      const toSend = toSendBoard
        ? toSendBoard
        : `${this.e.x} No quiz found with ${args[2] ?? "0"} rollbacks!`;
      message.channel.send(toSend);
      return;
    }

    let GBsortedByCorrect;
    if (!global.leaderboards || !global.leaderboards[message.guild.id]) {
      const guildDB = await Guilds.findOne({
        guildId: message.guild.id,
      });
      GBsortedByCorrect = await guildDB.get("leaderboard");
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
      const user =
        this.client.users.cache.find((u) => u.id == userId) ||
        message.guild.members.cache.find((u) => u.id == userId);
      guildBoardEmbed.addField(
        `Rank ${lbgGB + 1}. ${user.username}`,
        `<@${userId}> Correct: ${GBsortedByCorrect[lbgGB].count} | Time: ${
          GBsortedByCorrect[lbgGB].time / 1000
        } second(s)`
      );
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
  aliases: ["lbd"],
  permissions: ["SEND_MESSAGES"],
  cooldown: 3,
  color: "RANDOM",
  extraFields: [
    {
      name: "Local?",
      value:
        "Write `local` after leaderboard to see per-quiz leaderboard. Only valid for quizzes conducted in the server (latest)",
    },
    {
      name: "Number?",
      value:
        "Number of quizzes to roll back to. Defaults to 0, i.e. returns latest quiz.",
    },
  ],
  help: `<prefix>leaderboard [local?] [number?]`,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  },
};
