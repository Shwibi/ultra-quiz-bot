// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const quiz = require("../../store/quiz.json");
const quizCommand = require("../Basic Quiz/create");
const QuizModel = require("../../models/Quiz");
const CommandName = "Load";

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
	call(message) {
		if (!this.initiated)
			return new Err(
				`Called ${CommandName} command tendril without message initiation!`
			);

		const args = message.content.toLowerCase().split(/\s/);
		const commandRaw = args.shift();
		if (args[0]) {
			const nameToGet = args.join(" ");
			this.LoadQuiz(nameToGet, message);
		}
	}

	devLoad(name) {
		const message = new Discord.Message(
			this.client,
			{ author: this.client.user, content: `??new ${name}` },
			new Discord.Channel()
		);
	}

	async LoadQuiz(name, message = messageR) {
		const quizDetails = quiz[name];
		if (!quizDetails) return message.reply(`No such quiz found!`);
		quizCommand.instance.parseQuestions(
			quizDetails,
			message,
			async (allQuestions) => {
				let quizId;
				await QuizModel.estimatedDocumentCount({}, (err, count) => {
					if (err) {
						try {
							message.reply(
								`❌ Error: \n`,
								err,
								`\n\n Please let the dev know!`
							);
							this.Err(`❌ Error: \n`, err, `\n\n Please let the dev know!`);
						} catch (error) {
							this.Err(error);
						}
						message.reply(
							`❌ There was an error generating quiz, please try again later!`
						);
						this.Err(
							`❌ There was an error generating quiz, please try again later!`
						);

						return;
					}

					quizId = count;
				});
				quizId += 1;
				const quizDbInst = await QuizModel.create({
					quizId: quizId,
					quizDetails: allQuestions,
					name: name,
				});

				message.reply(
					`Successfully loaded ${name} quiz; Total: ${allQuestions.length} ID: ${quizId};`
				);
				this.InLog(
					`Successfully loaded ${name} quiz; Total: ${allQuestions.length} ID: ${quizId};`
				);
			}
		);
	}

	Err(error) {
		console.log(`[ERROR/LoadQuiz]`, error);
	}
}

const instance = new Command();

// Exports
module.exports = {
	name: CommandName.toLowerCase(),
	description: `Load a quiz manually`,
	useName: CommandName,
	ignore: false,
	guildOnly: false,
	aliases: [],
	permissions: ["SEND_MESSAGES", "DEV"],
	cooldown: 3,
	color: "RANDOM",
	args: ["<name>"],
	extraFields: [],
	help: `<prefix>load <name>`,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
	instance,
};
