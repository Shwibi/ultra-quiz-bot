// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const QuizModel = require("../../models/Quiz");
const Start = require("../Basic Quiz/start");
const Search = require("../Quiz Options/search");
const View = require("../Basic Quiz/view");
const {
    Cache,
    Err,
    Main
} = require(`../../utils/Utils`);

const CommandName = 'Delete';

class Command extends Message.Event {

    /**
     * Create command
     */
    constructor() {
        super(CommandName);
        this.deleted = [];
        this.doesNotExist = [];
        this.notExistMsg = `:x: That quiz does not exist!`;
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

        const args = message.content.toLowerCase().split(/\s/);
        const commandRaw = args.shift();
        const quizId = args[0];
        
        if(!quizId) return message.channel.send(`Please provide a quiz id to delete!`);
        if(isNaN(parseInt(quizId))) return message.channel.send(`Please provide a valid quiz id to delete!`);
        if(this.deleted.includes(quizId)) return message.channel.send(this.notExistMsg);

        // Search for quiz
        if(this.doesNotExist.includes(quizId)) return message.channel.send(this.notExistMsg);
        const quizDb = await QuizModel.findOne({quizId: quizId});
        if(!quizDb) {
          this.doesNotExist.push(quizId);
          return message.channel.send(this.notExistMsg);
        }

        if(quizDb.creator == message.author.id || message.isDev) {
          quizDb.deleteOne().then(
            message.channel.send(`Deleted quiz ${quizId}!`)
          )
          Start.instance.deleteQuiz(quizId);
          Search.instance.delete(quizId);
          View.instance.delete(quizId);
        }
        else {
          message.channel.send(`You do not have the permission to delete that quiz!`);
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
    permissions: ['SEND_MESSAGES'],
    cooldown: 3,
    color: 'RANDOM',
    extraFields: [],
    help: CommandName,
    call: async (message, client) => {
        if (!instance.initiated) instance.init(client);
        instance.call(message);
    }
}