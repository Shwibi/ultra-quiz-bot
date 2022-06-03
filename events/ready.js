const Index = require(`../index`);
const Cache = require(`../utils/Cache`);
const Err = require(`../utils/Err`);
const Guilds = require(`../models/Guilds`);
const Users = require(`../models/Users`);
const QuizRunning = require(`../models/QuizRunning`);
const Start = require(`../commands/Basic Quiz/start`);

class Ready extends Index.EntryPoint {
  constructor() {
    super(`event.ready`);
    this.initiated = false;
  }
  init(client) {
    if (this.initiated) return;
    this.client = client;
    this.initiated = true;
    this.cache.push(new Cache(`Initiated ready event!`));
  }
  async call() {
    if (!this.initiated)
      return new Err(
        `Called ready event without initialisation!`,
        `EVTRDYNOINIT`,
        { instance: this, class: Ready }
      );
    // Call ready event
    this.InLog(`Client online as ${this.client.user.tag}!`);
    this.cache.push(
      new Cache(`Client logged in and online!`, { client: this.client })
    );
    this.dev_logs = this.client.channels?.cache.get(this.config.Dev.dev_logs);
    if (!this.dev_logs)
      return console.log(`Bot online but no dev logs channel found!`);

    this.devLog(
      `${
        this.e.cozy
      } **Online!** At: ${new Date().toLocaleString()} | Platform: ${
        process.platform
      } | P-V: ${process.version} | Path: ${
        process.execPath
      } | <@${this.config.Bot.devs.join(">, <@")}>`
    );

    // Get quizzes running again
    const quizzesToRun = await QuizRunning.find({ completed: false });
    this.InLog({ quizzesToRun });
    quizzesToRun.forEach(async (quiz) => {
      if (
        !quiz.get("message").msg ||
        !quiz.get("message").msg.channel ||
        !quiz.get("channelId") ||
        !quiz.get("answeredUsers")
      ) {
        await quiz.deleteOne();
      }
      const channel = await this.client.channels?.cache.get(
        quiz.get("channelId")
      );
      const channelMsg = await channel.messages.fetch(quiz.get("messageId"));
      // this.InLog({ channel, channelMsg });
      Start.instance.init(this.client);
      Start.instance.call(
        channelMsg,
        quiz.get("questionNumber"),
        quiz.get("crossboard"),
        quiz.get("timeRemaining"),
        quiz.get("answeredUsers"),
        quiz.get("collectedUsers")
      );
    });
  }
}

const readyEventInstance = new Ready();

module.exports = {
  name: "ready",
  call: (client) => {
    if (!readyEventInstance.initiated) readyEventInstance.init(client);
    readyEventInstance.call();
  },
  Ready,
  readyEventInstance,
};
