// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const QuizModel = require("../../models/Quiz");

const CommandName = 'Create';

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

    const quizDetails = {};

    // Get initial question framework
    const lowerCaseMsg = message.content.toLowerCase();
    const args = lowerCaseMsg.split(/\s/);
    const rawCommand = args.shift();

    // Set name
    quizDetails.name = args[0] ? args.join(" ") : "Quiz";

    message.channel.send(
      `Creating a new quiz with the name **${quizDetails.name}**. Please type \`confirm\` to confirm. Type anything else to cancel. You have 20 seconds to choose, then this thread will close.`
    ).then(
      initialMessage => {

        const initialCollector = new Discord.MessageCollector(message.channel, receiveMsg => receiveMsg.member.id == message.author.id, { max: 1, time: 20000 });

        initialCollector.on("collect", (messageCollected) => {

          const optForFormat = messageCollected.content.toLowerCase().trim();
          if (optForFormat == "confirm") {
            // All questions in a single message
            initialMessage.edit(`You confirmed continuing. Please see the next message for more information.`);
            messageCollected.delete();
            message.channel.send(
              `❄ Creating quiz **${quizDetails.name}**. Please send all the questions in this format example given below in under 10 minutes: ` +
              `\`\`\`
                  EXAMPLE


                  -question What is 1 + 1 equal to?
                  -options --o 1 --c 2 --o 3 --o 4
                  -time 20


                  -question What is 2 x 5?
                  -options --o 7 --o 3 --c 10 --o 2.5
                  -time 10

              \`\`\` `+
              `\nIn this example, there are **two** questions. The string before \`-options\` represents the question. The string after \`-options\` `
              +
              `represents the options. In the options, \`--o <option\` represents a wrong answer, and \`--c <option>\` represents a correct answer. The string after` +
              ` \`-time\` represents the amount of time users should get to answer the question, in seconds.` +
              `\n\nIf your message is over 2000 characters, please contact the dev to add the quiz manually, as discord does not support message with over 2000 characters.`
            ).then(waitingForQuestionsAllMessage => {

              const allQuestionsCollector = new Discord.MessageCollector(message.channel, receiveMsg => receiveMsg.member.id == message.author.id, { max: 1, time: 10 * 60 * 1000 });

              allQuestionsCollector.on("collect", async allQuestionsCollected => {
                this.parseQuestions(allQuestionsCollected.content, allQuestionsCollected, async (allQuestions) => {
                  let quizId;
                  await QuizModel.estimatedDocumentCount({}, (err, count) => {
                    if (err) {
                      try {
                        message.member.send(
                          `❌ Error: \n`, err, `\n\n Please let the dev know!`
                        );
                      }
                      catch (error) {
                        this.InLog(error);
                      }
                      message.reply(`❌ There was an error generating quiz, please try again later!`);
                      waitingForQuestionsAllMessage.delete();
                      return;
                    }

                    quizId = count;
                  });
                  quizId += 1;
                  const quizDbInst = await QuizModel.create({
                    quizId: quizId,
                    quizDetails: allQuestions,
                    name: quizDetails.name
                  })
                  waitingForQuestionsAllMessage.delete();
                  message.channel.send(
                    `✅ Successfully parsed all the questions (${allQuestions.length}). The quiz id is ${quizId}. Please type \`${message.prefix}start ${quizId}\` to start this quiz.`
                  )
                });
              })

              allQuestionsCollector.on("end", (collected) => {
                if (collected.size == 0) {
                  waitingForQuestionsAllMessage.edit(`❌ Timed out and cancelled! Please try again!`);
                }
              })

            })
          }
          else {
            initialMessage.edit("Cancelled.");
          }

        })

        initialCollector.on("end", (collected) => {
          if (collected.size == 0) initialMessage.edit(`❌ Timed out and cancelled! Please try again!`);
        })

      }
    )

  }

  parseQuestions(allQuestionsContent, message, callback = (allQuestions) => { }) {
    const allQuestions = [];
    //TODO
    this.InLog(allQuestionsContent);
    const toParseRaw = allQuestionsContent.toLowerCase();
    if (!toParseRaw.includes(`-question`)) return message.channel.send(`Invalid format, please look at the example and try again!`);
    const questions = toParseRaw.split(`-question`);
    this.InLog({ questions });
    questions.forEach(question => {
      if (question.length == 0) return;
      if (!question.includes(`-options`) || !question.includes(`--o`) || !question.includes(`--c`)) return message.channel.send(`Invalid format, please look at the example and try again!`);
      this.InLog({ question });
      const questionSegment = {};
      const theQuestion = question.substr(0, question.indexOf("-")).trim();
      this.InLog({ theQuestion });
      questionSegment.question = theQuestion;

      const optsR = question.split("-options")[1];
      const optsRI = optsR.lastIndexOf("-t");
      const optsEnd = optsRI > 0 ? optsRI - 1 : optsR.length;
      this.InLog({ optsRI, optsEnd, optsR });
      const opts = optsR.substr(0, optsEnd).trim();
      const options = opts.split(/--/).slice(1);
      questionSegment.options = [];
      this.InLog({ opts, options });
      options.forEach(option => {
        questionSegment.options.push({ name: option.slice(1).trim(), status: option.substr(0, 1) });
      })

      // Time
      const timeArgs = question.includes("-time") ? question.split("-time") : ["", " 30 "];
      const timeString = timeArgs[1].trim();
      const time = !isNaN(timeString) ? parseFloat(timeString) * 1000 : 30 * 1000;
      questionSegment.time = time || 30000;

      allQuestions.push(questionSegment);

    })

    this.InLog({ allQuestions, options: allQuestions[0].options });

    return callback(allQuestions);
  }
}

const instance = new Command();

// Exports
module.exports = {
  name: CommandName.toLowerCase(),
  description: "Create a new quiz: Provide questions for sessions",
  useName: CommandName,
  ignore: false,
  guildOnly: false,
  aliases: ["new"],
  permissions: ['SEND_MESSAGES'],
  cooldown: 30,
  color: 'RANDOM',
  extraFields: [{ name: "Maximum limit", value: "2000 characters set by discord" }, { name: "Expiry", value: "Never" }],
  help: "To create a new quiz, please use the command \`<prefix>create [name of quiz]\`, then follow this format for questions: \n\`\`\`-question <Your question here> \n-options --o <wrong option> --o <wrong option> --c <correct option> \n-time <Time in seconds>\`\`\`You need at least a question, and one wrong option and a correct option. The time defaults to 10 seconds. It is compulsary to write time AFTER writing options. You don't need to add new lines after each argument, but you need spaces. \nYou can add as many options as you want.",
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  },
  instance
}