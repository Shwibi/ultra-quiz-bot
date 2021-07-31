// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main, LoadQuiz } = require(`../../utils/Utils`);


const CommandName = 'Load';

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

    const args = message.content.toLowerCase().split(/\s/);
    const commandRaw = args.shift();
    if (args[0]) {
      const nameToGet = args.join(" ");
      LoadQuiz(nameToGet, message);

    }

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
  permissions: ['SEND_MESSAGES', 'DEV'],
  cooldown: 3,
  color: 'RANDOM',
  extraFields: [],
  help: `<prefix>load <name>`,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}