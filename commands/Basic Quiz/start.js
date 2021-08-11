// Command tendril
const shwijs = require("shwi-js");
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main, Stack } = require(`../../utils/Utils`);
const QuizModel = require("../../models/Quiz");
const Guilds = require("../../models/Guilds");

const TIME_BETWEEN_QUESTIONS = 5;

const CommandName = "Start";

class Command extends Message.Event {
	/**
	 * Create command
	 */
	constructor() {
		super(CommandName);
		this.disbut = Index.disbut;
		this.needToStop = {};
		this.running = [];
		global.leaderboards = {};
		this.quizCache = {};
		this.stash = {
			id: new Stack.Stack("id"),
		};
		this.inSessionGuilds = {};

		setInterval(() => {
			this.quizCache = {};
			this.stash = {
				id: new Stack.Stack("id"),
			};
			global.leaderboards = {};
		}, this.config.Bot.reset_timer);
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

		const lowerCaseMsg = message.content.toLowerCase();
		const args = lowerCaseMsg.split(/\s/);
		const commandRaw = args.shift();

		if (this.running.includes(message.channel.id))
			return message.reply(
				`${this.e.x} There is already a quiz going on in this channel! Please wait until it is over, and then retry!`
			);

		let startsIn = 10;
		if (args[1]) {
			if (shwijs.IsInteger(parseInt(args[1]))) startsIn = parseInt(args[1]);
		}

		const id = args[0];
		if (!id)
			return message.reply(
				`${this.e.syntax} Please provide the id of the quiz to start!`
			);

		const timeBetweenQuestions = args[2]
			? !isNaN(parseInt(args[2]))
				? parseInt(args[2])
				: TIME_BETWEEN_QUESTIONS
			: TIME_BETWEEN_QUESTIONS;

		let quizFromDb;

		if (this.quizCache[id]) {
			quizFromDb = this.quizCache[id];
		} else {
			quizFromDb = await QuizModel.findOne({
				quizId: id,
			});
		}
		if (!quizFromDb || !quizFromDb.quizDetails)
			return message.reply(`${this.e.dum} There exists no such quiz!`);
		this.quizCache[id] = quizFromDb;
		const quizName = quizFromDb?.name || "Quiz";
		const qd = quizFromDb.quizDetails;

		const guildDB = await Guilds.findOne({
			guildId: message.guild.id,
		});
		if (!guildDB)
			return message.channel.send(
				`${this.e.error} Something went wrong! Please try again!`
			);
		this.banList = await guildDB.get("bannedUsers");
		if (this.banList.includes(message.author.id)) return message.delete();

		let pushToGB = true;
		if (args[3] && args[3] == "false") pushToGB = false;
		const completedQuizzes = await guildDB.get("completed");
		if (completedQuizzes.includes(id) && args[3] !== "force") pushToGB = false;

		message.channel
			.send(`The quiz **${quizName}** starts in ${startsIn} seconds.`)
			.then((msg) => {
				shwijs.Countdown(
					startsIn,
					(err, timeElapsed, timeRemaining) => {
						if (err) return err.log();
						if (timeRemaining < 4) {
							if (timeRemaining !== 0)
								msg.edit(
									`The quiz **${quizName}** starts in ${timeRemaining} seconds.`
								);
						}
					},
					async () => {
						this.needToStop[message.channel.id] = false;
						this.running.push(message.channel.id);
						if (this.inSessionGuilds[message.guild.id])
							this.inSessionGuilds[message.guild.id].push(id);
						else this.inSessionGuilds[message.guild.id] = [id];

						msg.delete();
						this.askQuestion(
							id,
							qd,
							0,
							message,
							timeBetweenQuestions,
							async (globalBoard) => {
								this.running = this.running.filter(
									(eachChannel) => eachChannel !== message.channel.id
								);
								this.inSessionGuilds[message.guild.id] = this.inSessionGuilds[
									message.guild.id
								].filter((quiz_id) => quiz_id !== id);

								await guildDB.updateOne({
									$push: {
										completed: id,
									},
								});

								message.channel.send(`The quiz **${quizName}** ended!`);
								this.InLog(globalBoard);
								const sortedByTime = globalBoard.sort(
									(a, b) => a.time - b.time
								);
								const sortedByCorrect = sortedByTime.sort(
									(a, b) => b.count - a.count
								);

								this.InLog(sortedByCorrect);

								if (pushToGB) {
									// overall leaderboard
									let guildBoard = (await guildDB.get("leaderboard")) || [];
									// guildBoard.push(...sortedByCorrect);
									guildBoard = this.pushBoard(
										sortedByCorrect,
										guildBoard,
										true
									);
									const GBsortedByTime = guildBoard.sort(
										(a, b) => a.time - b.time
									);
									const GBsortedByCorrect = GBsortedByTime.sort(
										(a, b) => b.count - a.count
									);
									await guildDB.updateOne({
										leaderboard: GBsortedByCorrect,
									});
									global.leaderboards[message.guild.id] = GBsortedByCorrect;

									// Send guildBoard to guild board channel
									const guildBoardEmbed = new Discord.MessageEmbed()
										.setTitle("Guild board")
										.setColor("RANDOM")
										.setTimestamp()
										.setFooter(`Total users: ${GBsortedByCorrect.length}`);
									const maxGB =
										GBsortedByCorrect.length < 11
											? GBsortedByCorrect.length
											: 10;
									for (let lbgGB = 0; lbgGB < maxGB; lbgGB++) {
										const userId = GBsortedByCorrect[lbgGB].userId;
										const user =
											this.client.users.cache.find((u) => u.id == userId) ||
											message.guild.members.cache.find((u) => u.id == userId);
										guildBoardEmbed.addField(
											`Rank ${lbgGB + 1}. ${user.username}`,
											`<@${userId}> Correct: ${
												GBsortedByCorrect[lbgGB].count
											} | Time: ${
												GBsortedByCorrect[lbgGB].time / 1000
											} second(s)`
										);
										if (lbgGB == 0) {
											guildBoardEmbed.setThumbnail(user.avatarURL());
										}
									}

									const sendToChannelId = await guildDB.get(
										"guildBoardChannel"
									);
									if (sendToChannelId) {
										const boardChannel = message.guild.channels.cache.find(
											(ch) => ch.id == sendToChannelId
										);
										if (boardChannel) {
											boardChannel.send(guildBoardEmbed);
										}
									}

									if (args[4] && args[4] == "dm") {
										message.member.send(guildBoardEmbed);
									}
								}

								const leaderBoardEmbed = new Discord.MessageEmbed()
									.setTitle(`Leaderboard for quiz **${quizName}**`)
									.setColor("RANDOM")
									.setTimestamp()
									.setFooter(
										`Total users: ${sortedByCorrect.length} | If you aren't in the leaderboards, check your dms. (You need to enable dms if you have them disabled)`
									);
								const max =
									sortedByCorrect.length < 11 ? sortedByCorrect.length : 10;
								sortedByCorrect.forEach((userInBoard) => {
									const userId = userInBoard.userId;
									const user =
										this.client.users.cache.find((u) => u.id == userId) ||
										message.guild.members.cache.find((u) => u.id == userId);
									const userEmbed = new Discord.MessageEmbed()
										.setAuthor(user.username, user.avatarURL({ dynamic: true }))
										.setTitle(`Quiz Results for **${quizName}**!`)
										.setDescription(
											`You got **${
												userInBoard.count
											} correct** out of a total of ${
												qd.length
											} questions! Time taken: ${
												userInBoard.time / 1000
											} second(s)`
										)
										.setColor("RANDOM")
										.setFooter(
											`Check **#${message.channel.name}** in **${message.guild.name}** for quiz leaderboard!`
										)
										.setTimestamp();

									user.send(userEmbed);
								});

								for (let lbdU = 0; lbdU < max; lbdU++) {
									const userId = sortedByCorrect[lbdU].userId;
									const user =
										this.client.users.cache.find((u) => u.id == userId) ||
										message.guild.members.cache.find((u) => u.id == userId);
									leaderBoardEmbed.addField(
										`Rank ${lbdU + 1}. ${user.username}`,
										`<@${userId}> Correct: ${
											sortedByCorrect[lbdU].count
										} | Time: ${sortedByCorrect[lbdU].time / 1000} second(s)`
									);
									if (lbdU == 0) {
										leaderBoardEmbed.setThumbnail(user.avatarURL());
									}
								}
								if (sortedByCorrect.length == 0)
									leaderBoardEmbed.addField(
										`Whooopsy!`,
										"Looks like no one got any questions in this quiz correct :("
									);

								message.channel.send(leaderBoardEmbed);
								await guildDB.updateOne({
									$push: {
										cache: leaderBoardEmbed,
									},
								});
								if (!this.stash[message.guild.id]) {
									const stack = new Stack.Stack(
										message.guild.id + "-leaderboard"
									);
									stack.push(leaderBoardEmbed);
									this.stash[message.guild.id] = stack;
								} else {
									this.stash[message.guild.id].push(leaderBoardEmbed);
								}

								try {
									message.member.send(leaderBoardEmbed);
								} catch (error) {
									if (error) this.InLog(error);
								}
							}
						);
					}
				);
			});
	}

	askQuestion(
		quizId,
		qd,
		i,
		message,
		timeBetweenQuestions,
		callbackOnEnd = (leaderboard) => {},
		globalBoard = []
	) {
		const q = qd[i];
		const QuestionEmbed = new Discord.MessageEmbed()
			.setDescription(`Click on the button that you think is the best answer!`)
			.setColor("RED")
			.setFooter(`You have ${q.time / 1000 || 30} seconds.`);
		if (q.question.length > 230) {
			QuestionEmbed.setTitle(
				`${i + 1}. (See description for question)`
			).setDescription(q.question);
		} else QuestionEmbed.setTitle(`${i + 1}. ${q.question}`);
		const optVals = {};
		const optButtonsRow = new this.disbut.MessageActionRow();
		let correctAnswer;
		let correctIndex;
		if (q.image) {
			QuestionEmbed.setImage(q.image);
		}
		for (let o = 0; o < q.options.length; o++) {
			optVals[o + 1] = {
				name: q.options[o].name,
				status: q.options[o].status,
			};
			if (q.options[o].status == "c") {
				correctAnswer = `${o + 1}) ${q.options[o].name}`;
				correctIndex = correctAnswer.substr(0, 1);
			}
		}
		correctAnswer =
			correctAnswer.length > 200 ? correctAnswer.substr(0, 200) : correctAnswer;
		for (const key in optVals) {
			// QuestionEmbed.addField(key, optVals[key].name)
			const label = optVals[key].name;
			let optBut;
			if (label.length < 75) {
				optBut = new this.disbut.MessageButton()
					.setLabel(label)
					.setID(`${quizId}-${i + 1}-${key}`)
					.setStyle("green");
			} else {
				QuestionEmbed.addField(`Option ${key}`, label);
				optBut = new this.disbut.MessageButton()
					.setLabel(key)
					.setID(`${quizId}-${i + 1}-${key}`)
					.setStyle("green");
			}
			optButtonsRow.addComponent(optBut);
		}

		message.channel.send(QuestionEmbed, optButtonsRow).then((embedMsg) => {
			let answeredUsers = [];
			let localLeaderboard = [];
			let quizRunning = true;

			this.client.on("clickButton", async (button) => {
				const buttonArgs = button.id.split("-");
				const answerDate = Date.now();
				const ID =
					(await button.clicker?.user?.id) || button.clicker?.member?.id;
				if (this.banList.includes(ID)) {
					await button.reply.send("You are not allowed to answer quizzes!");
					return;
				}

				if (buttonArgs[0] == quizId && buttonArgs[1] == i + 1 && quizRunning) {
					if (answeredUsers.includes(ID))
						return await button.reply.send(
							"Sneaky! You've already answered this question though ;)",
							true
						);
					answeredUsers.push(ID);
					if (buttonArgs[2] == correctIndex) {
						await button.reply.send(`You got it right!`, true);

						localLeaderboard.push({
							userId: ID,
							time: answerDate - embedMsg.createdTimestamp,
							count: 1,
						});
					} else {
						await button.reply.send(
							`Oops, you got it wrong! The correct answer was **${correctAnswer}**`,
							true
						);
					}
				}
			});

			shwijs.Countdown(
				q.time / 1000 || 30,
				(err, timeElapsed, timeRemaining) => {
					if (err) return err.log();
					const t = timeRemaining;
					const isMod5 = t % 5 == 0 ? (t > 9 ? true : false) : false;
					if (t < 4 || isMod5)
						embedMsg.edit(
							QuestionEmbed.setFooter(`You have ${timeRemaining} seconds.`),
							optButtonsRow
						);
				},
				() => {
					quizRunning = false;
					// localLeaderboard.forEach(lb => {
					//   let foundUserInGB = false;
					//   for (let gb = 0; gb < globalBoard.length; gb++) {

					//     if (lb.userId == globalBoard[gb].userId) {
					//       globalBoard[gb].count = globalBoard[gb].count ? globalBoard[gb].count + 1 : 1;
					//       globalBoard[gb].time = globalBoard[gb].time ? globalBoard[gb].time + lb.time : lb.time;
					//       foundUserInGB = true;
					//     }

					//   }
					//   if (!foundUserInGB) {
					//     globalBoard.push(lb);
					//   }
					// })
					globalBoard = this.pushBoard(localLeaderboard, globalBoard);

					embedMsg.edit(
						QuestionEmbed.setFooter("Question time ended.")
							.setColor("GREEN")
							.addField(
								`Question time ended!`,
								`The correct answer was ${correctAnswer}`
							)
					);
					if (qd[i + 1] && !this.needToStop[message.channel.id]) {
						// this.askQuestion(quizId, qd, i + 1, message, callbackOnEnd);
						shwijs.Countdown(
							timeBetweenQuestions,
							(err, te, tr) => {
								// if (tr < 4) waitNextMsg.edit(`Next question is coming in ${tr} seconds...`);
							},
							() => {
								this.askQuestion(
									quizId,
									qd,
									i + 1,
									message,
									timeBetweenQuestions,
									callbackOnEnd,
									globalBoard
								);
							}
						);
					} else {
						callbackOnEnd(globalBoard);
					}
				}
			);

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

	pushBoard(localLeaderboard = [], globalBoard = [], global = false) {
		localLeaderboard.forEach((lb) => {
			let foundUserInGB = false;
			for (let gb = 0; gb < globalBoard.length; gb++) {
				if (lb.userId == globalBoard[gb].userId) {
					const increaseCount = global ? lb.count : 1;
					globalBoard[gb].count = globalBoard[gb].count
						? globalBoard[gb].count + increaseCount
						: 1;
					globalBoard[gb].time = globalBoard[gb].time
						? globalBoard[gb].time + lb.time
						: lb.time;
					foundUserInGB = true;
				}
			}
			if (!foundUserInGB) {
				globalBoard.push(lb);
			}
		});
		return globalBoard;
	}

	deleteQuiz(id) {
		if (this.quizCache && this.quizCache[id]) {
			delete this.quizCache[id];
		}
	}
}

const instance = new Command();

// Exports
module.exports = {
	name: CommandName.toLowerCase(),
	description: "Start a quiz!",
	useName: CommandName,
	ignore: false,
	guildOnly: true,
	aliases: ["begin"],
	args: [
		"<id>",
		"[time before start]",
		"[time b/w q]",
		"[serverboard: true/false/force]",
		"[dm?]",
	],
	permissions: ["SEND_MESSAGES"],
	cooldown: 25,
	color: "#FF00B5",
	extraFields: [
		{
			name: "ID",
			value: "The id of the quiz you got after creating the quiz.",
			inline: true,
		},
		{
			name: "Time",
			value: "Write the number of seconds the quiz should start in.",
			inline: true,
		},
		{
			name: "Add in server board",
			value:
				"Use true to add to server board (default). \nUse false to prevent adding this quiz to server board. \nUse force to add the quiz to the guild leaderboard even if it already exists.",
		},
		{
			name: "DM",
			value:
				"Write `dm` to get a dm with the guild leaderboard after the quiz is over.",
			inline: true,
		},
		{
			name: "Example",
			value:
				"`??start 5 15 true dm` This will start the quiz with the id **5** in **15 seconds** and add it to guild leaderboard if it does not exist, it will also dm the user with the server leaderboard after the quiz.\n`??start 5 10 force dm` This will start the quiz with id **5** in **15 seconds** and add it to server leaderboard even if it already exists, then it will dm the user with the server leaderboard after the quiz has ended.",
		},
	],
	help: "Start a new quiz using the quiz ID you got after creating the quiz. Format: `<prefix>start <id> [time in seconds] [time between questions in seconds (default 5 seconds)] [add in server board: true/false/force] [dm the global board: dm]`",
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
	instance,
};
