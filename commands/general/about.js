// Command tendril
const Discord = require(`discord.js`);

const Index = require(`../../index`);

const fs = require(`fs`);
const mongoose = require(`mongoose`);
const pack = require("../../package.json");

const Message = require(`../../events/message`);

const { Cache, Err, Main, msToTime } = require(`../../utils/Utils`);

const { Qm } = require("../../managers/QuizManager");

const UPDATES = `
\`10/08/2021\` - Added "info" command, QuizManager(dev), handled error logging(dev)
`;

const CommandName = "About";

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

		// Get information about the bot
		const InformationEmbed = new Discord.MessageEmbed()
			.setAuthor(
				this.client.user.username,
				this.client.user.avatarURL({ dynamic: true })
			)
			.setTitle(`About me | ${this.client.user.username}@${pack.version}`)
			.setDescription(
				`I am a quiz bot that helps you make quiz! I am fully customisable, and very easy to use! Plus, I'm being actively developed every day :)`
			)
			.setColor(`RANDOM`)
			.setFooter(`Use ${message.prefix}help to get help with the commands!`);

		// Set client ws ping
		InformationEmbed.addField(`Ping`, msToTime(this.client.ws.ping), true);

		// Get number of guilds
		InformationEmbed.addField(
			`Guilds served`,
			this.client.guilds.cache.size,
			true
		);

		// Get number of users
		InformationEmbed.addField(`Users`, this.client.users.cache.size, true);

		// Total number of quizzes
		const totalQuizzes = await Qm.size();
		if (!isNaN(totalQuizzes))
			InformationEmbed.addField(`Number of quizzes`, totalQuizzes, true);
		else this.InLog(totalQuizzes);

		// Uptime
		InformationEmbed.addField(`Uptime`, msToTime(this.client.uptime), true);

		// Developers
		const AllDevs = [];
		const RawDevs = [];
		this.config.Bot.devs.forEach((dev) => {
			const Dev = this.client.users.cache.get(dev);
			RawDevs.push(Dev);
			AllDevs.push(`${Dev.tag}: <@${Dev.id}>`);
		});
		InformationEmbed.addField(`Developers`, AllDevs.join(", \n"));
		InformationEmbed.setFooter(
			InformationEmbed.footer.text,
			RawDevs[0].avatarURL({ dynamic: true })
		);

		// Updates
		InformationEmbed.addField(`Updates (DD/MM/YYYY)`, UPDATES.trim());

		// Send the embed :D
		message.channel.send({ embed: InformationEmbed });
	}
}

const instance = new Command();

// Exports
module.exports = {
	name: CommandName.toLowerCase(),
	description: `Get information about the bot!`,
	useName: CommandName,
	ignore: false,
	guildOnly: false,
	aliases: ["info", "aboutme", "aboutbot", "bot", "whatisit", "whoareyou"],
	permissions: ["SEND_MESSAGES"],
	cooldown: 5,
	color: "#FF8D5F",
	extraFields: [],
	help: CommandName,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
};
