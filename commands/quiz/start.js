// Command tendril
const shwijs = require("shwi-js");
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const QuizModel = require("../../models/Quiz");

const timeBetweenQuestions = 5;

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
    this.disbut = Index.disbut;
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

    let startsIn = 10;
    if (args[1]) {
      if (shwijs.IsInteger(parseInt(args[1]))) startsIn = parseInt(args[1]);
    }

    const id = args[0];
    if (!id) return message.reply(`Please provide the id of the quiz to start!`);

    const quizFromDb = await QuizModel.find({ quizId: id });
    if (!quizFromDb || !quizFromDb[0]?.quizDetails) return message.reply(`There exists no such quiz!`);
    const quizName = quizFromDb[0]?.name || "Quiz";
    const qd = quizFromDb[0].quizDetails;

    message.channel.send(`The quiz **${quizName}** starts in ${startsIn} seconds.`).then(msg => {
      shwijs.Countdown(startsIn, (err, timeElapsed, timeRemaining) => {
        if (err) return err.log();
        if (timeRemaining < 4) {
          if (timeRemaining !== 0) msg.edit(`The quiz **${quizName}** starts in ${timeRemaining} seconds.`)
        }
      }, () => {
        msg.delete();
        this.askQuestion(id, qd, 0, message, () => {
          message.channel.send(`The quiz **${quizName}** ended!`)
        });
      })
    })




  }

  askQuestion(quizId, qd, i, message, callbackOnEnd = () => { }) {
    const q = qd[i];
    const QuestionEmbed = new Discord.MessageEmbed()
      .setTitle(`${i + 1}. ${q.question}.`)
      .setDescription(`Click on the button that you think is the best answer!`)
      .setColor('RED')
      .setFooter(`You have ${(q.time / 1000) || 30} seconds.`);

    const optVals = {};
    const optButtonsRow = new this.disbut.MessageActionRow();
    let correctAnswer;
    let correctIndex;
    for (let o = 0; o < q.options.length; o++) {
      optVals[o + 1] = { name: q.options[o].name, status: q.options[o].status };
      if (q.options[o].status == "c") {
        correctAnswer = `${o + 1}) ${q.options[o].name}`;
        correctIndex = correctAnswer.substr(0, 1);
      };

    }
    for (const key in optVals) {
      QuestionEmbed.addField(key, optVals[key].name)
      let optBut = new this.disbut.MessageButton()
        .setLabel(optVals[key].name)
        .setID(`${quizId}-${i + 1}-${key}`)
        .setStyle("blurple");
      optButtonsRow.addComponent(optBut);
    }


    message.channel.send(QuestionEmbed, optButtonsRow).then(embedMsg => {

      let answeredUsers = [];
      let quizRunning = true;
      shwijs.Countdown((q.time / 1000) || 30, (err, timeElapsed, timeRemaining) => {
        if (err) return err.log();
        const t = timeRemaining;
        if (t < 4 || (t > 9 && t & 5 == 0)) embedMsg.edit(QuestionEmbed.setFooter(`You have ${timeRemaining} seconds.`), optButtonsRow);
      }, () => {
        quizRunning = false;
        embedMsg.edit(QuestionEmbed.setFooter("Question time ended.").setColor("GREEN").setDescription(`The correct answer was ${correctAnswer}`));
        if (qd[i + 1]) {
          message.channel.send(`Next question is coming in ${timeBetweenQuestions} seconds...`).then(waitNextMsg => {
            // this.askQuestion(quizId, qd, i + 1, message, callbackOnEnd);
            shwijs.Countdown(timeBetweenQuestions, (err, te, tr) => {
              if (tr < 4) waitNextMsg.edit(`Next question is coming in ${tr} seconds...`);
            }, () => {
              this.askQuestion(quizId, qd, i + 1, message, callbackOnEnd);
            })
          })

        }
        else {
          callbackOnEnd();
        }
      })

      this.client.on("clickButton", async (button) => {
        const buttonArgs = button.id.split("-");



        if (buttonArgs[0] == quizId && buttonArgs[1] == i + 1 && quizRunning) {

          if (answeredUsers.includes(button.clicker.user.id)) return await button.reply.send("Sneaky! You've already answered this question though ;)".true);

          if (buttonArgs[2] == correctIndex) {
            await button.reply.send(`You got it right!`, true);
          }
          else {
            await button.reply.send(`Oops, you got it wrong! The correct answer was **${correctAnswer}**`, true);
          }
        }
      })



      // const collector = new Discord.MessageCollector(message.channel, msg => !msg.author.bot, { time: q.time || 30000 });

      // collector.on("end", (collected) => {
      //   embedMsg.edit(QuestionEmbed.setColor('GREEN'));
      //   message.channel.send(`**Question time ends for question number ${i + 1}**. The correct answer was **${correctAnswer}**`);

      //   let messagedUsers = [];
      //   collected.each(messageCollectedEach => {
      //     if (messagedUsers.includes(messageCollectedEach.member.id)) return;
      //     if (messageCollectedEach.author.bot) return;
      //     messagedUsers.push(messageCollectedEach.member.id);
      //     try {
      //       if (messageCollectedEach.content.toLowerCase() == correctAnswer.substr(0, 1)) {
      //         messageCollectedEach.react("✅");
      //         messageCollectedEach.member.send(`Yay! You got question number ${i + 1} right! Correct answer: ${correctAnswer}. Your answer: ${messageCollectedEach.content}`);
      //       }
      //       else {
      //         messageCollectedEach.react("❌")
      //         messageCollectedEach.member.send(`Aww, you got question number ${i + 1} wrong! The correct answer was ${correctAnswer}. Your answer: ${messageCollectedEach.content}`);
      //       }
      //     }
      //     catch (err) {
      //       if (err) this.InLog(err);
      //     }
      //   })

      //   if (qd[i + 1]) {
      //     message.channel.send(`The next question comes in 5 seconds.`).then(msg => {
      //       shwijs.Countdown(5, (err, timeElapsed, timeRemaining) => {
      //         if (timeRemaining < 4) {
      //           if (timeRemaining !== 0) msg.edit(`The next question comes in ${timeRemaining} seconds.`)
      //         }
      //       }, () => {
      //         msg.delete();
      //       })
      //     })
      //     setTimeout(() => {
      //       this.askQuestion(qd, i + 1, message, callbackOnEnd);
      //     }, 5000)
      //   }
      //   else {
      //     callbackOnEnd(collected);
      //   }

      // })

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