// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);

const CommandName = "Help";

class Command extends Message.Event {
	/**
	 * Create command
	 */
	constructor() {
		super(CommandName);

		this.helpFields = [
			{
				name: "Help usage: <> - Required",
				value:
					'All across the bot, especially in help modules, whenever you see anything enclosed in "<" and ">" it means  **it is required** to carry out that process/command.',
			},
			{
				name: "Help usage: [] - Optional",
				value:
					'Similar to "<>" but instead of required, this encloses **optional** parameters. This means that process/command would work even without this parameter.',
			},
			{
				name: "Help usage: option? - Parameter",
				value:
					'This is an **optional** parameter, and you have to type the exact `option` the `?` is put after to enable it. For example, if a command has the help `<prefix>command [notify?]` you have to use it as `<prefix>command notify` to enable the "notify" option',
			},
		];
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
			const commandToFind = args[0];
			const command = this.client.commands.find(
				(cmd) =>
					cmd.name.includes(commandToFind) ||
					(cmd.aliases && cmd.aliases.includes(commandToFind))
			);
			if (!command)
				return message.channel.send(`No such command found!`).then((msg) => {
					msg.delete({ timeout: 5000 });
					message.delete({ timeout: 5000 });
				});
			let canContinue = "yeh";
			for (let p = 0; p < command.permissions; p++) {
				if (command.permissions[p] == "DEV") {
					if (!message.isDev) canContinue = "noh";
					continue;
				}
				if (!message.member.hasPermission(command.permissions[i]))
					canContinue = "noh";
			}
			if (!canContinue)
				return message.channel
					.send(`You do not have enough permissions to use that command!`)
					.then((msg) => {
						msg.delete({ timeout: 5000 });
						message.delete({ timeout: 5000 });
					});
			const commandHelpEmbed = new Discord.MessageEmbed()
				.setTitle(command.useName || command.name)
				.setDescription(command.description || command.useName)
				.setColor(command.color || "RANDOM")
				.addField("Guild only?", command.guildOnly, true)
				.addField("Cooldown", command.cooldown, true)
				.addField(
					"Aliases",
					command.aliases.length > 0
						? command.aliases.join(", \n")
						: "No aliases",
					true
				)
				.addField("More information", command.help)
				.setFooter(`Requested by ${message.author.tag}`)
				.setTimestamp();
			const commandExtras = command.extraFields || [];
			if (commandExtras.length > 0)
				commandHelpEmbed.addFields(command.extraFields);
			message.channel.send(commandHelpEmbed);
			return;
		}

		const helpEmbed = new Discord.MessageEmbed()
			.setTitle(`Help is here!`)
			.setDescription(
				`Here are all my commands! The prefix for the server is \`${message.prefix}\``
			)
			.setColor(`RANDOM`)
			.setTimestamp()
			.setFooter(`Requested by ${message.author.tag}`);

		const commandCats = fs.readdirSync(`./commands`);
		for (const cat of commandCats) {
			let allcmds = [];
			const commandFiles = fs
				.readdirSync(`./commands/${cat}`)
				.filter((file) => file.endsWith(`.js`) && !file.startsWith(`$`));
			for (const file of commandFiles) {
				const command = require(`../../commands/${cat}/${file}`);
				command.status = "yeh";
				let commandPerms = command.permissions || ["SEND_MESSAGES"];
				for (let i = 0; i < commandPerms.length; i++) {
					if (commandPerms[i] == "DEV") {
						if (!message.isDev) command.status = "noh";
						continue;
					}
					if (!message.member.hasPermission(commandPerms[i]))
						command.status = "noh";
				}
				if (command.status !== "noh") allcmds.push(command.useName);
			}
			let catName =
				cat.substr(0, 1).toUpperCase() + cat.substr(1, cat.length - 1);
			if (allcmds.length !== 0)
				helpEmbed.addField(catName, allcmds.join(`, \n`), true);
		}

		helpEmbed.addFields(this.helpFields);

		// Other info
		helpEmbed.addField(
			`Other information`,
			`**Devs:** <@${this.config.Bot.devs.join(`>, <@`)}> \n${
				this.e.luv
			} [**Invite**](${this.config.Bot.invite}) \n${
				this.e.help
			} [**Support server**](${this.config.Bot.support})`
		);

		message.channel.send(helpEmbed);
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
	permissions: ["SEND_MESSAGES"],
	cooldown: 3,
	color: "ORANGE",
	extraFields: instance.helpFields,
	help: CommandName,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
};
