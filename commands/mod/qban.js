// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const Guilds = require("../../models/Guilds");

const CommandName = 'QBan';

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

    const args = message.content.toLowerCase().split(/\s/);
    const rawCommand = args.shift();

    if (args.length == 0) return message.channel.send(`Please provide the ID of the user or mention the user you want to ban!`);

    const guildDB = await Guilds.findOne({ guildId: message.guild.id });
    if (!guildDB) return message.channel.send(`There was an error!`);
    const userId = message.mentions.members.size !== 0 ? message.mentions.members.first().id : !isNaN(args[0]) ? args[0] : "invalid";
    if (userId == "invalid") return message.channel.send(`Invalid user ID!`);
    const previousBanList = await guildDB.get("bannedUsers");
    if (args[1] == "unban") {
      if (!previousBanList.includes(userId)) return message.channel.send(`User does not exist in ban list!`);
      await guildDB.updateOne({
        $pull: {
          bannedUsers: userId
        }
      }).then(() => {
        message.channel.send(`✅ Removed <@${userId}> from ban list!`);
      })
    }
    else {
      if (previousBanList.includes(userId)) return message.channel.send(`User already exists in ban list!`);
      await guildDB.updateOne({
        $push: {
          bannedUsers: userId
        }
      }).then(() => {
        message.channel.send(`✅ Added <@${userId}> to ban list!`);
      })
    }



  }
}

const instance = new Command();

// Exports
module.exports = {
  name: CommandName.toLowerCase(),
  description: "Ban a member from participating in quizzes",
  useName: CommandName,
  ignore: false,
  guildOnly: true,
  aliases: ["qb"],
  permissions: ['SEND_MESSAGES', 'KICK_MEMBERS'],
  cooldown: 3,
  color: 'YELLOW',
  extraFields: [],
  help: "`<prefix>qban <user ping/user id> [ban/unban]",
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}