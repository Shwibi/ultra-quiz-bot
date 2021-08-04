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
        this.notFound = [];
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

        if(this.notFound.includes(quizId)) return message.reply(`Did not find any quiz with that id!`);

        // Get from cache
        if(this.quizCache[quizId]) {
          quizDetails = this.quizCache[quizId];
        }
        else {
          const fromDB = await QuizModel.findOne({quizId: quizId});
          if(!fromDB) return message.reply(`Did not find any quiz with that id!`);
          quizDetails = fromDB.toObject();
          this.quizCache[quizId] = quizDetails;
          // this.InLog(quizDetails);
        }

        // Generate pages
        const allQuestions = quizDetails.quizDetails;
        const totalPages = Math.ceil(allQuestions.length / this.maxPerPage)
        let pageNumber = args[1] ? !isNaN(parseInt(args[1])) ? parseInt(args[1]) <= totalPages ? parseInt(args[1]) : 1 : 1 : 1;
        let Embed = new Discord.MessageEmbed()
          .setTitle(`Viewing quiz **${quizDetails.name || "Quiz"}**`)
          .setDescription(`ID: ${quizDetails.quizId} | Total Questions: ${allQuestions.length}`)
          .setColor("RANDOM")
          .setFooter(`Viewing page ${pageNumber}/${totalPages}`)
          .setTimestamp();

        if(allQuestions.length > this.maxPerPage) {
          Embed = this.embed(pageNumber, allQuestions, Embed, totalPages);
        }
        else {
          const allQuestions = quizDetails.quizDetails;
          for(let i = 0; i < allQuestions.length; i++) {
            const qu = allQuestions[i]
            // this.InLog({pageNumber, max: this.maxPerPage})
            const optArray = [];
            let correctAnswer;
            qu.options.forEach(opt => {
              optArray.push(opt.name);
              if(opt.status == "c") correctAnswer = opt.name;
            })
            Embed = this.addOption(Embed, i, qu, correctAnswer, optArray)
          }
        }

        message.channel.send(Embed).then(msg => {
          
          msg.react("◀").then(
            msg.react("▶")
          )
          
          this.handleReact(msg, pageNumber, totalPages, allQuestions, Embed, message)
        });

    }

    handleReact(msg, pageNumber, totalPages, allQuestions, Embed, message) {

        // msg.reactions.removeAll();
      

        const collector = msg.createReactionCollector((reaction, user) => user.id == message.author.id && (reaction.emoji.name == "▶" || reaction.emoji.name == "◀"), {max: 1, time: 15000});
        collector.on("collect", (reaction, user) => {
          
          if(user.bot) return;

          if(reaction.emoji.name == "◀" && pageNumber > 1) {

            pageNumber--;
            Embed = this.embed(pageNumber, allQuestions, Embed, totalPages);
            if(user.id !== this.client.user.id) reaction.remove;

          }

          if(reaction.emoji.name == "▶" && pageNumber < totalPages) {
            pageNumber++;
            Embed = this.embed(pageNumber, allQuestions, Embed, totalPages);
            if(user.id !== this.client.user.id) reaction.remove;
            
          }

          msg.edit(Embed).then(this.handleReact(msg, pageNumber, totalPages, allQuestions, Embed, message));

        })
      
    }

    embed(pageNumber = 1, allQuestions, Embed, totalPages) {
      Embed.fields = [];
      const maxLoop = (this.maxPerPage*(pageNumber)) <= allQuestions.length ? (this.maxPerPage*(pageNumber)) : allQuestions.length;
      for(let i = (this.maxPerPage * (pageNumber - 1)); i < maxLoop; i++) {
        const DoI = i + (this.maxPerPage * (pageNumber - 1));
        const qu = allQuestions[i];
        // this.InLog({qu, allQuestions});
        // this.InLog({pageNumber, max: this.maxPerPage, DoI})
        const optArray = [];
        let correctAnswer;
        qu.options.forEach(opt => {
          optArray.push(opt.name);
          if(opt.status == "c") correctAnswer = opt.name;
        })
        // Embed.addField(`${i + 1}. ${qu.question}`, `Options: \n${optArray.join("\n")} \n\nCorrect answer: ${correctAnswer}`);
        Embed = this.addOption(Embed, i, qu, correctAnswer, optArray)
      }
      Embed.setFooter(`Viewing page ${pageNumber}/${totalPages} | You have 15 seconds to change pages with reactions.`);
      return Embed;
    }

    addOption(Embed, i, qu, correctAnswer, optArray) {
      const allOptions = "Options: \n" + optArray.join("\n") + `\n\nCorrect answer: ${correctAnswer}`;
      let field = allOptions;
      let question = `${i + 1}. ${qu.question}`;
      if(question.length > 250) {
        field = `[Question continued] ${question.substr(230, question.length)} \n${allOptions}`
        question = question.substr(0, 250);
        
      }
      Embed.addField(question, field);
      return Embed;
    }

    delete(id) {
      delete this.quizCache[id];
      this.notFound.push(id);
    }

    add(id) {
      this.notFound = this.notFound.filter(i => i != id);
    }
}

const instance = new Command();

// Exports
module.exports = {
    name: CommandName.toLowerCase(),
    description: "View a quiz using it's id!",
    useName: CommandName,
    ignore: false,
    guildOnly: false,
    aliases: ["see"],
    permissions: ['SEND_MESSAGES'],
    cooldown: 10,
    color: '#C281FF',
    extraFields: [{name: "Quiz ID", value: "You can get the quiz id by using the `search` command!"}, {name: "Page number", value: "This is an optional parameter. Just use the command without it and look for the number of pages at the bottom of the embed, and then look at any page number you want by reusing the command!"}],
    help: `<prefix>view <quizId> [Page number]`,
    call: async (message, client) => {
        if (!instance.initiated) instance.init(client);
        instance.call(message);
    },
    instance
}