// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const { Um } = require("../../managers/UserManager");

const CommandName = "Premium";

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

		const args = message.content.split(/\s/);
		const user = args[1];
		const userId = message.mentions.users?.first()
			? message.mentions.users.first().id
			: user;
		const userUser = this.client.users.cache.get(userId);
		if (!userId || !userUser)
			return message.channel.send(`${this.e.x} Invalid user!`);

		const state = args[2] ? args[2] : "add";
		switch (state) {
			case "add": {
				let userDoc = await Um.find(userId);
				if (!userDoc) userDoc = await Um.create(userUser);
				if (userDoc.get("isPremium"))
					return message.channel.send(`User already premium.`);
				await Um.makePremium(userId, true);
				message.channel.send(`Made <@${userId}> a premium user!`);
				break;
			}
			case "remove": {
				let userDoc = await Um.find(userId);
				if (!userDoc) userDoc = await Um.create(userUser);
				if (!userDoc.get("isPremium"))
					return message.channel.send(`User is not premium.`);
				await Um.makePremium(userId, false);
				message.channel.send(`Removed <@${userId}> from premium users!`);

				break;
			}
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
	permissions: ["DEV"],
	cooldown: 3,
	args: ["<user>", "[add/remove]"],
	color: "RANDOM",
	extraFields: [],
	help: CommandName,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
};
