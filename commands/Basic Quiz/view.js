// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const QuizModel = require("../../models/Quiz");
const Message = require(`../../events/message`);
const {
    Cache,
    Err,
    Main
} = require(`../../utils/Utils`);

const CommandName = 'View';

class Command extends Message.Event {

    /**
     * Create command
     */
    constructor() {
        super(CommandName);
        this.quizCache = {};
        this.maxPerPage = 10;
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
        if(!quizId || isNaN(parseInt(quizId))) return message.reply(`Please provide a valid quiz id to view!`)

        let quizDetails;

        // Get from cache
        if(this.quizCache[quizId]) {
          quizDetails = this.quizCache[quizId];
        }
        else {
          const fromDB = await QuizModel.findOne({quizId: quizId});
          if(!fromDB) return message.reply(`Did not find any quiz with that id!`);
          quizDetails = fromDB.toObject();
          this.quizCache[quizId] = quizDetails;
          this.InLog(quizDetails);
        }

        // Generate pages
        const allQuestions = quizDetails.quizDetails;
        const totalPages = Math.ceil(allQuestions.length / this.maxPerPage)
        let pageNumber = args[1] ? !isNaN(parseInt(args[1])) ? parseInt(args[1]) <= totalPages ? parseInt(args[1]) : 1 : 1 : 1;
        const Embed = new Discord.MessageEmbed()
          .setTitle(`Viewing quiz **${quizDetails.name || "Quiz"}**`)
          .setDescription(`ID: ${quizDetails.quizId} | Total Questions: ${allQuestions.length}`)
          .setColor("RANDOM")
          .setFooter(`Viewing page ${pageNumber}/${totalPages}`)
          .setTimestamp();

        if(allQuestions.length > this.maxPerPage) {
          const maxLoop = (this.maxPerPage*(pageNumber)) <= allQuestions.length ? (this.maxPerPage*(pageNumber)) : allQuestions.length;
          for(let i = (this.maxPerPage * (pageNumber - 1)); i < maxLoop; i++) {
            const DoI = i + (this.maxPerPage * (pageNumber - 1));
            const qu = allQuestions[i]
            this.InLog({pageNumber, max: this.maxPerPage, DoI})
            const optArray = [];
            let correctAnswer;
            qu.options.forEach(opt => {
              optArray.push(opt.name);
              if(opt.status == "c") correctAnswer = opt.name;
            })
            Embed.addField(`${i + 1}. ${qu.question}`, `Options: \n${optArray.join("\n")} \n\nCorrect answer: ${correctAnswer}`);
          }
        }
        else {
          const allQuestions = quizDetails.quizDetails;
          for(let i = 0; i < allQuestions.length; i++) {
            const qu = allQuestions[i]
            this.InLog({pageNumber, max: this.maxPerPage})
            const optArray = [];
            let correctAnswer;
            qu.options.forEach(opt => {
              optArray.push(opt.name);
              if(opt.status == "c") correctAnswer = opt.name;
            })
            Embed.addField(`${i + 1}. ${qu.question}`, `Options: \n${optArray.join("\n")} \n\nCorrect answer: ${correctAnswer}`);
          }
        }

        message.channel.send(Embed);

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