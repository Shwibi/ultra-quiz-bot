// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const {
  Cache,
  Err,
  Main
} = require(`../../utils/Utils`);

const CommandName = 'ToDo';

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

    const args = message.content.split(/\s/);
    const commandRaw = args.shift();
    const ticketID = args.shift();

    const todoContent = args.join(" ");
    if (!todoContent || !ticketID) return message.channel.send(`${this.e.x} Please send a todo message!`);

    const toSend = `${this.e.tic}${ticketID} ***[${message.author.username}]*** - ${todoContent}`;
    const channel = this.client.channels.cache.find(c => c.id == this.config.Dev.todo_channel);
    if (channel) {
      channel.send(toSend).then(

        message.channel.send(`${this.e.r} Added todo with **ID ${ticketID}**!`)

      )
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
  permissions: ['DEV'],
  cooldown: 3,
  color: 'RANDOM',
  extraFields: [],
  help: CommandName,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}