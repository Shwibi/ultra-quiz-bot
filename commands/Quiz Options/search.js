// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const QuizModel = require("../../models/Quiz");
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);

const CommandName = "Search";

class Command extends Message.Event {
	/**
	 * Create command
	 */
	constructor() {
		super(CommandName);
		this.quizzes = [];
		this.didNotFind = `Oops! Did not find any quizzes matching that name!`;
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
		if (!this.initiated)
			return new Err(
				`Called ${CommandName} command tendril without message initiation!`
			);

		const args = message.content.split(/\s/);
		const commandRaw = args.shift();

		const nameOfQuiz = args.join(" ");
		if (!nameOfQuiz)
			return message.channel.send(
				`:x: Please provide the name of the quiz you want to search for!`
			);

		let canContinue = true;
		// Check if not found
		this.notFound.forEach((q) => {
			if (
				q.name.includes(nameOfQuiz.toLowerCase()) &&
				Date.now() - q.time < 120 * 1000
			)
				canContinue = false;
			if (Date.now() - q.time > 120 * 1000) canContinue = true;
		});
		if (!canContinue) return message.reply(this.didNotFind);

		// Search for quizzes
		let foundInCache = false;
		let quizFound;
		let idArray = [];
		this.quizzes.forEach((q) => {
			if (q.name.toLowerCase().includes(nameOfQuiz.toLowerCase())) {
				foundInCache = true;
				quizFound = q;
				idArray.push(`${q.quizId}: ${q.name}`);
			}
		});
		idArray = idArray.filter((i) => i.split(":")[0] != quizFound.quizId);
		if (foundInCache) {
			const QuizEmbed = new Discord.MessageEmbed()
				.setTitle(`Found ${idArray.length + 1} quiz(zes)! ${quizFound.name}`)
				.setDescription(
					`Name: ${quizFound.name} | Total questions: ${quizFound.quizDetails.length} | ID: ${quizFound.quizId}`
				)

				.setColor(`RANDOM`);

			if (idArray.length > 0) {
				QuizEmbed.addField(
					`Other quiz(zes) with similar name`,
					idArray.join(", \n")
				);
			}
			message.channel.send(QuizEmbed);
		} else {
			const findQuizzesFromDB = [
				...(await QuizModel.find({
					name: {
						$regex: new RegExp(".*" + nameOfQuiz.toLowerCase() + ".*", "i"),
					},
				})),
			];
			// this.InLog({nameOfQuiz, findQuizzesFromDB});
			if (findQuizzesFromDB.length == 0) {
				message.reply(this.didNotFind);
				this.notFound.push({
					name: nameOfQuiz.toLowerCase(),
					time: Date.now(),
				});
				return;
			}
			let idArray = [];
			findQuizzesFromDB.forEach((quizFound) => {
				this.quizzes.push(quizFound.toObject());

				idArray.push(`${quizFound.quizId}: ${quizFound.name}`);
			});

			const firstQuiz = findQuizzesFromDB[idArray.length - 1];
			idArray = idArray.filter((i) => i.split(":")[0] != firstQuiz.quizId);
			const QuizFoundEmbed = new Discord.MessageEmbed()
				.setTitle(
					`Found ${findQuizzesFromDB.length} quiz(zes)! | ${firstQuiz.name}`
				)
				.setDescription(
					`Name: ${firstQuiz.name} | Total questions: ${firstQuiz.quizDetails.length} | ID: ${firstQuiz.quizId}`
				)

				.setColor("RANDOM");
			if (idArray.length > 0) {
				QuizFoundEmbed.addField(
					`Other quiz(zes) with similar name`,
					idArray.join(", \n")
				);
			}
			message.channel.send(QuizFoundEmbed);
		}
	}

	delete(id) {
		this.quizzes = this.quizzes.filter((q) => q.quizId != id);
	}
}

const instance = new Command();

// Exports
module.exports = {
	name: CommandName.toLowerCase(),
	description: "Find a quiz by searching for a name!",
	useName: CommandName,
	ignore: false,
	guildOnly: false,
	aliases: ["find"],
	permissions: ["SEND_MESSAGES"],
	cooldown: 10,
	args: ["<name>"],
	color: "RANDOM",
	extraFields: [],
	help: `<prefix>search <name of quiz>`,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
	instance,
};
