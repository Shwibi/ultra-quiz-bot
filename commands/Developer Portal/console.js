// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);

const CommandName = "Console";

class Command extends Message.Event {
  /**
   * Create command
   */
  constructor() {
    super(CommandName);
    this.inSession = [];
    this.sessions = [];
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
    const commandRaw = args.shift();

    if (args[0] == "stop") {
      this.InLog(this.sessions);
      if (this.endSession(message, this.sessions.length)) {
        //do nothing?
      } else message.channel.send(`No session going on!`);
      return;
    } else {
      if (this.inSession.includes(this.sessions.length))
        return message.channel.send(`Already in a session!`);
    }
    const defaultTime = this.config.Dev.time ?? 120;
    const time = args[0]
      ? !isNaN(parseFloat(args[0]))
        ? parseFloat(args[0]) * 1000
        : defaultTime * 1000
      : defaultTime * 1000;

    const sessionID = this.sessions.length + 1;

    if (this.startSession(time, message, sessionID)) {
      const collector = new Discord.MessageCollector(
        message.channel,
        (u) =>
          u.author.id == message.author.id &&
          this.inSession.includes(sessionID) &&
          !u.content.startsWith("??") &&
          !u.content.startsWith("d?"),
        { time: time }
      );
      collector.on("collect", (msg) => {
        if (!this.inSession) return;
        const toParse = msg.content;
        let toProcess;

        if (toParse.startsWith("```")) {
          toProcess = toParse.substr(
            toParse.indexOf("\n") + 1,
            toParse.lastIndexOf("\n") - toParse.indexOf("\n")
          );
        } else {
          toProcess = toParse;
        }
        this.InLog({ toParse, toProcess });
        this.cache.push(
          new Cache(`Console parsing \n${toProcess}`, { toParse, toProcess })
        );
        try {
          eval(toProcess);
        } catch (error) {
          if (error) {
            const err = new Err(error, "EVAL-ERROR", { toParse, toProcess });
            message.channel.send(
              `:x: Could not evaluate! Please check logs! \n[${err.code}]-${err.info.id}`
            );
          }
        }
      });
    } else return message.channel.send(`Already a session going on!`);
  }

  endSession(message, sessionID) {
    if (this.inSession.includes(sessionID)) {
      this.inSession = this.inSession.filter((s) => s != sessionID);
      this.cache.push(
        new Cache(`Ended session for dev console!`, {
          time: new Date(),
          stamp: Date.now(),
          locale: new Date().toLocaleString(),
        }).Log()
      );

      message.channel.send(
        `Ended console session! **Session ID: ${sessionID}**!`
      );
      return true;
    } else return false;
  }

  startSession(receivedTime, message, sessionID) {
    if (!this.inSession.includes(sessionID)) {
      this.inSession.push(sessionID);
      const time = new Date();
      this.cache.push(
        new Cache(
          `Started session for dev console! At: ${time.toLocaleString()}`,
          {
            time: time,
            stamp: time.toUTCString(),
            locale: time.toLocaleString(),
          }
        ).Log()
      );
      this.sessions.push(sessionID);
      message.channel.send(
        `Started console session for ${
          receivedTime / 1000
        } second(s)! **Session ID: ${sessionID}**`
      );
      setTimeout(() => {
        this.endSession(message);
      }, receivedTime);
      return true;
    } else return false;
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
  aliases: ["cns"],
  permissions: ["DEV"],
  cooldown: 3,
  color: "RANDOM",
  extraFields: [],
  help: CommandName,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  },
};
