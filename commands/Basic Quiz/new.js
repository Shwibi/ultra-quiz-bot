// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const { Parse } = require("../../sandbox/parser");

const CommandName = "New";

class NewCommand extends Message.Event {
  /**
   * Create command
   */
  constructor() {
    super(CommandName);

    this.allQuizCache = [];

    this.quizTemplate = `
-question Enter your question here
-type mcq/tf/text
IF MCQ: -options +o Wrong option here +c Correct option here +o Wrong option here +o Wrong option here
IF TRUE OR FALSE: -answer true/false
IF TEXT: -answer Input your text here
-time TIME IN SECONDS HERE
-image IMAGE LINK/URL HERE IF ANY
    `;
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
    if (!this.initiated)
      return new Err(
        `Called ${CommandName} command tendril without message initiation!`
      );

    let NAME = "";
    message.delete({ timeout: 10000 });
    // Ask the user for quiz name
    message.channel
      .send({
        content: "Please type in the name of the quiz. You have 30 seconds",
      })
      .then((askForNameMsg) => {
        const NameCollector = new Discord.MessageCollector(
          message.channel,
          (msg) => msg.author.id == message.author.id,
          {
            max: 1,
            time: 30000,
          }
        );
        NameCollector.on("collect", (nameMessage) => {
          // Got name message, now set the name
          NAME = nameMessage.content.replace(/\s/, "_");
          // Call aftermath
          this.afterName(message, NAME, askForNameMsg);
          nameMessage.delete({ timeout: 1500 });
        });
        NameCollector.on("end", (collected) => {
          if (collected.size == 0) {
            askForNameMsg.edit({
              content:
                ":( You didn't input any name. Mission Quiz Create aborted.",
            });
          }
        });
      });
  }

  /**
   *
   * @param {Discord.Message} message
   * @param {String} name
   * @param {Discord.Message} askForNameMsg
   */
  afterName(message, name, askForNameMsg) {
    askForNameMsg.edit({
      content: `You input the name: ${name}! Please enter the quiz details as per the following format: \`\`\`${this.quizTemplate}\`\`\` You have 10 minutes. `,
    });

    // Create quiz details collector
    const quizDetailsCollector = new Discord.MessageCollector(
      message.channel,
      (msg) => msg.author.id == message.author.id,
      { max: 1, time: 10 * 60 * 1000 }
    );

    quizDetailsCollector.on("collect", (collectedMsg) => {
      // Get attachment/content
      this.getContent(collectedMsg, (err, content) => {
        if (err) {
          // There's an error!
          message.channel.send({
            content: `An error occured! ${err.message}`,
          });
          return;
        }

        // Got the content safely! now parse it :)
        Parse(content, name, (err, quiz) => {
          if (err) {
            message.channel.send({
              content: `An error occured! ${err.code}: ${err.message}`,
            });
            askForNameMsg.edit(
              `An error occured, please see below for more details!`
            );
            return;
          }

          collectedMsg.delete({ timeout: 15000 });
          // Got the quiz! YAY!
          askForNameMsg.edit({
            content: `Parsed quiz! Name: \`${quiz.name}\` | Number of questions: ${quiz.questions.length} | DEVBUILD_CALL_CACHE:${this.allQuizCache.length}`,
          });
          this.allQuizCache.push(quiz);
        });
      });
    });

    quizDetailsCollector.on("end", (collected) => {
      if (collected.size == 0) {
        askForNameMsg.edit({
          content: `:( You did not specify any details. Mission aborted.`,
        });
      }
    });
  }

  /**
   *
   * @param {Discord.Message} message
   */
  async getContent(message, callback = (err = new Err(), content = "") => {}) {
    let returner = "";
    if (message.attachments.size > 0) {
      // They uploaded a text file
      const fileAtt = message.attachments.first();
      const fileExt = fileAtt.name.split(".")[1];
      if (fileExt !== "txt")
        return callback(
          new Err("File extension is not text file!", "INVALID FILE", {
            fileAtt,
          }),
          null
        );

      // We have the text file, fetch using https
      const toRead = fileAtt.attachment;
      if (toRead) {
        // Get read response
        https.get(toRead).on("response", function (response) {
          var body = "";
          var i = 0;
          response.on("data", function (chunk) {
            i++;
            body += chunk;
            // console.log("BODY Part: " + i);
          });
          response.on("end", function () {
            // console.log(body);
            returner = body;
            // console.log("Finished");
          });
        });
      } else returner = message.content;
    } else returner = message.content;

    return callback(null, returner);
  }
}

const newInstance = new NewCommand();

// Exports
module.exports = {
  name: CommandName.toLowerCase(),
  description: CommandName,
  useName: CommandName,
  ignore: false,
  guildOnly: false,
  aliases: ["make"],
  permissions: ["SEND_MESSAGES", "DEV"],
  cooldown: 3,
  args: [],
  color: "RANDOM",
  extraFields: [],
  help: CommandName,
  call: async (message, client) => {
    if (!newInstance.initiated) newInstance.init(client);
    newInstance.call(message);
  },
  newInstance,
};
