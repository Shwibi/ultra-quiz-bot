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
      `Creating a new quiz with the name **${quizDetails.name}**. Please select the format in which you will provide questions,` +
      ` all in one message or one by one? Type \`all\` for all in one message, or type \`one\` for one by one. If you choose one by one` +
      ` method, you can end the questions by typing \`end\` instead of your question. You have 20 seconds to choose, then this thread will close.`
    ).then(
      initialMessage => {

        const initialCollector = new Discord.MessageCollector(message.channel, receiveMsg => receiveMsg.member.id == message.author.id, { max: 1, time: 20000 });

        initialCollector.on("collect", (messageCollected) => {

          const optForFormat = messageCollected.content.toLowerCase().trim();
          if (optForFormat == "all") {
            // All questions in a single message
            initialMessage.edit(`You chose \`all\` in one. Please see the next message for more information.`);
            messageCollected.delete();
            message.channel.send(
              `You chose \`all\`. Please send all the questions in this format example given below under 10 minutes: ` +
              `\`\`\`
                  EXAMPLE


                  -question What is 1 + 1 equal to?
                  -options --o 1 --c 2 --o 3 --o 4
                  -time 20


                  -question What is 2 x 5?
                  -options --o 7 --o 3 --c 10 --o 2.5
                  -time 10

              \`\`\` `+
              `\nIn this example, there are **two** questions. The string before \`-options\` represents the question. The string after \`-options\` and before \`~\``
              +
              `represents the options. In the options, \`--o <option\` represents a wrong answer, and \`--c <option>\` represents a correct answer.`
            ).then(waitingForQuestionsAllMessage => {

              const allQuestionsCollector = new Discord.MessageCollector(message.channel, receiveMsg => receiveMsg.member.id == message.author.id, { max: 1, time: 10 * 60 * 1000 });

              allQuestionsCollector.on("collect", async allQuestionsCollected => {
                this.parseQuestions(allQuestionsCollected.content, async (allQuestions) => {
                  let quizId;
                  await QuizModel.estimatedDocumentCount({}, (err, count) => {
                    if (err) {
                      try {
                        message.member.send(
                          `Error: \n`, err, `\n\n Please let the dev know!`
                        );
                      }
                      catch (error) {
                        this.InLog(error);
                      }
                      message.reply(`There was an error generating quiz, please try again later!`);
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
                  message.channel.send(
                    `
                    
                    Successfully parsed all the questions (${allQuestions.length}). The quiz id is ${quizId}. Please type \`${message.prefix}start ${quizId}\` to start this quiz.

                    `
                  )
                });
              })

            })
          }

        })

      }
    )

  }

  parseQuestions(allQuestionsContent, callback = (allQuestions) => { }) {
    const allQuestions = [];
    //TODO
    this.InLog(allQuestionsContent);
    const toParseRaw = allQuestionsContent.toLowerCase();

    const questions = toParseRaw.split(`-question`);
    this.InLog({ questions });
    questions.forEach(question => {
      if (question.length == 0) return;
      this.InLog({ question });
      const questionSegment = {};
      const theQuestion = question.substr(0, question.indexOf("-")).trim();
      this.InLog({ theQuestion });
      questionSegment.question = theQuestion;

      const optsR = question.split("-options")[1];
      const optsRI = optsR.indexOf("t");
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
  permissions: ['SEND_MESSAGES', 'ADMINISTRATOR', 'DEV'],
  cooldown: 3,
  color: 'RANDOM',
  help: CommandName,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}