const Discord = require("discord.js");

const quiz = require("../store/quiz.json");
const quizCommand = require("../commands/quiz/create");
const QuizModel = require("../models/Quiz");

const messageR = new Discord.Message();

async function LoadQuiz(name, message = messageR) {
  const quizDetails = quiz[name];
  if (!quizDetails) return message.reply(`No such quiz found!`);
  quizCommand.instance.parseQuestions(quizDetails, message, (allQuestions) => {
    let quizId;
    await QuizModel.estimatedDocumentCount({}, (err, count) => {
      if (err) {
        try {
          message.reply(
            `❌ Error: \n`, err, `\n\n Please let the dev know!`
          );

        }
        catch (error) {
          Err(error);
        }
        message.reply(`❌ There was an error generating quiz, please try again later!`);

        return;
      }

      quizId = count;
    });
    quizId += 1;
    const quizDbInst = await QuizModel.create({
      quizId: quizId,
      quizDetails: allQuestions,
      name: name
    })

    message.reply(`Successfully loaded ${name} quiz; ID: ${quizId}; DB: `, quizDbInst);

  })
}

function Err(error) {
  console.log(`[ERROR/LoadQuiz]`, error)
}


module.exports = LoadQuiz;