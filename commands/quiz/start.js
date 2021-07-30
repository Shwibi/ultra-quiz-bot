// Command tendril
const shwijs = require("shwi-js");
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const QuizModel = require("../../models/Quiz");

const CommandName = 'Start';

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

    const lowerCaseMsg = message.content.toLowerCase();
    const args = lowerCaseMsg.split(/\s/);
    const commandRaw = args.shift();

    const id = args[0];
    if (!id) return message.reply(`Please provide the id of the quiz to start!`);

    const quizFromDb = await QuizModel.find({ quizId: id });
    if (!quizFromDb || !quizFromDb[0]?.quizDetails) return message.reply(`There exists no such quiz!`);
    const quizName = quizFromDb[0]?.name || "Quiz";
    const qd = quizFromDb[0].quizDetails;

    message.channel.send(`The quiz **${quizName}** starts in 10 seconds.`).then(msg => {
      shwijs.Countdown(10, (err, timeElapsed, timeRemaining) => {
        if (err) return err.log();
        if (timeRemaining % 5 == 0 || timeRemaining < 4) {
          msg.edit(`The quiz **${quizName}** starts in ${timeRemaining} seconds.`)
        }
      }, () => {
        msg.delete();
        this.askQuestion(qd, 0, message, (collected) => {
          message.channel.send(`The quiz **${quizName}** ended!`)
        });
      })
    })




  }

  askQuestion(qd, i, message, callbackOnEnd = (collected) => { }) {
    const q = qd[i];
    const QuestionEmbed = new Discord.MessageEmbed()
      .setTitle(`${i + 1}. ${q.question}.`)
      .setDescription(`Send the correct number for your chosen option. You have ${q.time / 1000} seconds.`)
      .setColor('RED');
    const optVals = {};
    let correctAnswer;
    for (let o = 0; o < q.options.length; o++) {
      optVals[o + 1] = { name: q.options[o].name, status: q.options[o].status };
      if (q.options[o].status == "c") correctAnswer = `${o + 1}) ${q.options[o].name}`;
    }
    for (const key in optVals) {
      QuestionEmbed.addField(key, optVals[key].name)
    }

    message.channel.send(QuestionEmbed).then(embedMsg => {

      const collector = new Discord.MessageCollector(message.channel, msg => !msg.author.bot, { time: q.time });

      collector.on("end", (collected) => {
        embedMsg.edit(QuestionEmbed.setColor('GREEN'));
        message.channel.send(`**Question time ends for question number ${i + 1}**. The correct answer was **${correctAnswer}**`);

        let messagedUsers = [];
        collected.each(messageCollectedEach => {
          if (messagedUsers.includes(messageCollectedEach.member.id)) return;
          if (messageCollectedEach.author.bot) return;
          messagedUsers.push(messageCollectedEach.member.id);
          try {
            if (messageCollectedEach.content.toLowerCase() == correctAnswer.substr(0, 1)) {
              messageCollectedEach.react("✅");
              messageCollectedEach.member.send(`Yay! You got question number ${i + 1} right! Correct answer: ${correctAnswer}. Your answer: ${messageCollectedEach.content}`);
            }
            else {
              messageCollectedEach.react("❌")
              messageCollectedEach.member.send(`Aww, you got question number ${i + 1} wrong! The correct answer was ${correctAnswer}. Your answer: ${messageCollectedEach.content}`);
            }
          }
          catch (err) {
            if (err) this.InLog(err);
          }
        })

        if (qd[i + 1]) {
          message.channel.send(`The next question comes in 5 seconds.`).then(msg => {
            shwijs.Countdown(5, (err, timeElapsed, timeRemaining) => {
              msg.edit(`The next question comes in ${timeRemaining} seconds.`)
            }, () => {
              msg.delete();
            })
          })
          setTimeout(() => {
            this.askQuestion(qd, i + 1, message, callbackOnEnd);
          }, 5000)
        }
        else {
          callbackOnEnd(collected);
        }

      })

    });

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
  help: CommandName,
  call: async (message, client) => {
    if (!instance.initiated) instance.init(client);
    instance.call(message);
  }
}