// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);

const toStop = require("../Basic Quiz/start");
const CommandName = 'Stop';

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
  call(message) {

    if (!this.initiated) return new Err(`Called ${CommandName} command tendril without message initiation!`);
    toStop.instance.needToStop[message.channel.id] = true;
    message.reply(`All quizzes in this channel will stop as soon as their current question is over!`);
  }
}

const instance = new Command();

// Exports
module.exports = {
  name: CommandName.toLowerCase(),
  description: "Stop all the quizes currently going on.",
  useName: CommandName,
  ignore: false,
  guildOnly: false,
  aliases: ["abort"],
  permissions: ['SEND_MESSAGES', 'KICK_MEMBERS'],
  cooldown: 3,
  color: 'RANDOM',
  extraFields: [],
  help: `<prefix>stop`,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}