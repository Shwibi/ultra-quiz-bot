// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const View = require("../Basic Quiz/view");
const { Cache, Err, Main } = require(`../../utils/Utils`);
const QuizModel = require("../../models/Quiz");
const https = require("https");
const Parse = require("../../utils/Parse");
const { Qm } = require("../../managers/QuizManager");
const { Um } = require("../../managers/UserManager");

const CommandName = "Create";

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
		if (!this.initiated)
			return new Err(
				`Called ${CommandName} command tendril without message initiation!`
			);

		const quizDetails = {};

		// Get initial question framework
		const lowerCaseMsg = message.content.toLowerCase();
		const rawArgs = message.content.split(/\s/);
		const rawCommandUpper = rawArgs.shift();
		const args = lowerCaseMsg.split(/\s/);
		const rawCommand = args.shift();

		// Set name
		quizDetails.name = rawArgs[0] ? rawArgs.join(" ") : "Quiz";

		message.channel
			.send(
				`Creating a new quiz with the name **${quizDetails.name}**. Please type \`confirm\` to confirm. Type anything else to cancel. You have 20 seconds to choose, then this thread will close.`
			)
			.then((initialMessage) => {
				const initialCollector = new Discord.MessageCollector(
					message.channel,
					(receiveMsg) => receiveMsg.member.id == message.author.id,
					{
						max: 1,
						time: 20000,
					}
				);

				initialCollector.on("collect", (messageCollected) => {
					const optForFormat = messageCollected.content.toLowerCase().trim();
					if (optForFormat == "confirm") {
						// All questions in a single message
						initialMessage.edit(
							`You confirmed continuing. Please see the next message for more information.`
						);
						messageCollected.delete();
						message.channel
							.send(
								`❄ Creating quiz **${quizDetails.name}**. Please send all the questions in this format example given below in under 10 minutes: ` +
									`\`\`\`
                  EXAMPLE


                  -question What is 1 + 1 equal to?
                  -options +o 1 +c 2 +o 3 +o 4
                  -time 20
                  -image https://media.discordapp.net/attachments/871442026602827827/871754169155977336/unknown.png?width=306&height=187


                  -question What is 2 x 5?
                  -options +o 7 +o 3 +c 10 +o 2.5
                  -image https://media.discordapp.net/attachments/871442026602827827/871754169155977336/unknown.png?width=306&height=200
                  -time 10

              \`\`\` ` +
									`\nIn this example, there are **two** questions. The string before \`-options\` represents the question. The string after \`-options\` ` +
									`represents the options. In the options, \`+o <option\` represents a wrong answer, and \`+c <option>\` represents a correct answer. The string after` +
									` \`-time\` represents the amount of time users should get to answer the question, in seconds.` +
									`\n\nIf your message is over 2000 characters, please upload your questions as a \`.txt\` file (use the popup discord gives).` +
									`\nPlease do not use option nunbering/lettering such as "A" "B" or "1" "2" etc. in the options. That gets set automatically!`
							)
							.then((waitingForQuestionsAllMessage) => {
								const allQuestionsCollector = new Discord.MessageCollector(
									message.channel,
									(receiveMsg) => receiveMsg.member.id == message.author.id,
									{
										max: 1,
										time: 10 * 60 * 1000,
									}
								);

								allQuestionsCollector.on(
									"collect",
									async (allQuestionsCollected) => {
										waitingForQuestionsAllMessage.edit(
											`Quiz collected, please read any follow-up messages for further information!`
										);
										let toParse = allQuestionsCollected.content;
										if (allQuestionsCollected.attachments.size !== 0) {
											const toRead =
												allQuestionsCollected.attachments.first().attachment;
											console.log(toRead);
											if (toRead) {
												https.get(toRead).on("response", function (response) {
													var body = "";
													var i = 0;
													response.on("data", function (chunk) {
														i++;
														body += chunk;
														console.log("BODY Part: " + i);
													});
													response.on("end", function () {
														console.log(body);
														toParse = body;
														console.log("Finished");
													});
												});
											}
										} else toParse = allQuestionsCollected.content;
										// User model
										let isPremium = false;
										let userMod = await Um.find(message.author.id);
										if (!userMod) {
											userMod = await Um.create(message.author);
										}
										if (userMod.get("isPremium")) isPremium = true;

										setTimeout(() => {
											Parse(
												toParse,
												async (err, allQuestions) => {
													allQuestionsCollected.delete();

													if (err) {
														this.InLog(err.info);
														this.delete(waitingForQuestionsAllMessage);
														// this.delete(allQuestionsCollected);
														message.channel.send(
															`${this.e.syntax} ${err.message}`
														);
														return;
													}

													const quizDbInst = await Qm.Create({
														quizDetails: allQuestions,
														name: quizDetails.name,
														creator: message.author.id,
													});
													const quizId = await quizDbInst.get("quizId");
													View.instance.add(quizId);
													message.channel.send(
														`${this.e.cool} Successfully parsed all the questions (${allQuestions.length}). The quiz id is ${quizId}. Please type \`${message.prefix}start ${quizId}\` to start this quiz.`
													);
													const configChannel = this.client.channels.cache.find(
														(ch) => ch.id == this.config.Dev.quiz.log_channel
													);
													if (configChannel) {
														const configEmbed = new Discord.MessageEmbed()
															.setTitle(
																`New quiz ${quizDetails.name} | ID: ${quizId}`
															)
															.setDescription(
																`Created by ${message.author.tag}. ID: ${message.author.id}`
															)
															.addField(`Quiz name`, quizDetails.name)
															.addField(
																`Number of questions`,
																allQuestions.length
															)
															.addField(
																`Channel`,
																`<#${message.channel.id}> | ${message.channel.id}`,
																true
															)
															.addField(
																`Guild`,
																`Name: ${message.guild.name} | ID: ${message.guild.id}`
															)
															.setTimestamp()
															.setColor("#55EC2B");
														configChannel.send(configEmbed);
													}
												},
												isPremium
											);
										}, 1000);
									}
								);

								allQuestionsCollector.on("end", (collected) => {
									if (collected.size == 0) {
										waitingForQuestionsAllMessage.edit(
											`${this.e.x} Timed out and cancelled! Please try again!`
										);
									}
								});
							});
					} else {
						initialMessage.edit("Cancelled.");
					}
				});

				initialCollector.on("end", (collected) => {
					if (collected.size == 0)
						initialMessage.edit(
							`${this.e.x} Timed out and cancelled! Please try again!`
						);
				});
			});
	}

  /**
   * @deprecated
   */
	parseQuestions(
		allQuestionsContent,
		message,
		callback = (allQuestions) => {},
		lowerCase = false
	) {
		const allQuestions = [];
		//TODO
		this.InLog(allQuestionsContent);
		let toParseRaw = allQuestionsContent;
		if (lowerCase) toParseRaw = allQuestionsContent.toLowerCase();
		if (!toParseRaw.includes(`-question`)) {
			this.InLog("WRONG", toParseRaw);
			message.channel.send(
				`Invalid format, please look at the example and try again!`
			);
		}
		const questions = toParseRaw.split(`-question`);
		this.InLog({
			questions,
		});
		questions.forEach((question) => {
			if (question.length == 0) return;
			if (
				!question.includes(`-options`) ||
				!question.includes(`+o`) ||
				!question.includes(`+c`)
			) {
				message.channel.send(
					`Invalid format, please look at the example and try again!`
				);
				this.InLog("WRONG", question);
			}
			this.InLog({
				question,
			});
			const questionSegment = {};
			const theQuestion = question
				.substr(0, question.indexOf("-options"))
				.trim();
			this.InLog({
				theQuestion,
			});
			questionSegment.question = theQuestion;

			const optsR = question.split("-options")[1];
			const optsRItime = optsR.indexOf("-time");
			let optsRI = optsR.indexOf("-time");
			const optsRIimg = optsR.indexOf("-image");
			if (optsRIimg > optsRItime || optsRIimg < 0) optsRI = optsRItime;
			else optsRI = optsRIimg;

			const optsEnd = optsRI > 0 ? optsRI - 1 : optsR.length;
			this.InLog({
				optsRI,
				optsEnd,
				optsR,
			});
			const opts = optsR.substr(0, optsEnd).trim();
			const options = opts.split(/\+/).slice(1);
			questionSegment.options = [];
			this.InLog({
				opts,
				options,
			});
			options.forEach((option) => {
				questionSegment.options.push({
					name: option.slice(1).trim(),
					status: option.substr(0, 1),
				});
			});

			if (questionSegment.options.length > 5)
				return message.channel.send(
					`You can only have a maximum of 5 options per question! Question: ${questionSegment.question}`
				);

			// Time
			const timeArgs = question.includes("-time")
				? question.split("-time")
				: ["", " 30 "];
			const timeLastIndex = timeArgs[1].includes("-")
				? timeArgs[1].lastIndexOf("-")
				: timeArgs[1].length;
			const timeString = timeArgs[1].trim().substr(0, timeLastIndex);
			const time = !isNaN(timeString)
				? parseFloat(timeString) * 1000
				: 30 * 1000;
			questionSegment.time = time || 30000;

			// Image
			if (question.includes("-image")) {
				const imgArgs = question.split("-image");
				const rawURL = imgArgs[1];
				const imgLastIndex = rawURL.includes("-t")
					? rawURL.lastIndexOf("-t")
					: rawURL.length;
				const imageURL = rawURL.substr(0, imgLastIndex).trim();
				questionSegment.image = imageURL;
			}

			allQuestions.push(questionSegment);
		});

		this.InLog({
			allQuestions,
			options: allQuestions[0].options,
		});

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
	permissions: ["SEND_MESSAGES"],
	cooldown: 30,
	args: ["<name of quiz>"],
	color: "#21B54A",
	extraFields: [
		{
			name: "Maximum limit",
			value: "No limit! You can even upload a text file if you want :)",
		},
		{
			name: "Expiry",
			value: "Never",
		},
		{
			name: "Image",
			value:
				"The image is considered as a part of the question, you can link to an image using `-image <url>` and it will show up in the embed.",
		},
	],
	help: "To create a new quiz, please use the command `<prefix>create [name of quiz]`, then follow this format for questions: \n```-question <Your question here> \n-options +o <wrong option> +o <wrong option> +c <correct option> \n-time <Time in seconds> \n-image <Url>```You need at least a question, and one wrong option and a correct option. The time defaults to 10 seconds. It is compulsary to write time AFTER writing options. You need to add new lines after each argument, exactly like in the example. \nYou can add as many options as you want.",
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
	instance,
};
