// Command tendril
const Discord = require(`discord.js`);
const Index = require(`../../index`);
const fs = require(`fs`);
const mongoose = require(`mongoose`);
const Message = require(`../../events/message`);
const { Cache, Err, Main } = require(`../../utils/Utils`);
const { remove: replace } = require("../../models/Guilds");

const CommandName = "ToDo";

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
		const commandRaw = args.shift();
		const raw = args[0];

		const channel = this.client.channels.cache.find(
			(c) => c.id == this.config.Dev.todo_channel
		);

		let ticketID = raw;

		if (["done", "off", "working", "delete"].includes(ticketID.toLowerCase())) {
			let replaceBy = this.e.on;

			switch (ticketID.toLowerCase()) {
				case "done":
					replaceBy = this.e.on;
					break;
				case "off":
					replaceBy = this.e.off;
					break;
				case "working":
					replaceBy = this.e.idle;
					break;
				case "delete":
					replaceBy = "delete";
					break;
				default:
					replaceBy = this.e.on;
					break;
			}

			this.channelFetch(channel, args.slice(1), replaceBy, (err) => {
				if (err) return this.InLog(err);
				this.delete(message);
				message.channel
					.send(`${this.e.r} Marked ${args[1]} as ${ticketID}!`)
					.then((ms) => this.delete(ms, 5));
			});

			return;
		}

		channel.messages.fetch({ limit: 10 }).then((collected) => {
			let store = 0;
			collected.forEach((m) => {
				const ticket = m.content.split(/\s/).shift();
				const fetchTicketId = ticket.split(this.e.tic).join("").trim();
				this.InLog({ ticket, fetchTicketId });
				const parseId = parseInt(fetchTicketId);
				if (parseId > store) {
					ticketID = this.padNum(parseId + 1, 3);
					store = parseId;
				}
			});
		});

		setTimeout(async () => {
			const todoContent = args.join(" ");
			if (!todoContent || !ticketID)
				return message.channel.send(`${this.e.x} Please send a todo message!`);

			const toSend = `${this.e.tic}${ticketID} ***[${message.author.username}]*** - ${todoContent} ${this.e.off}`;
			if (channel) {
				channel.send(toSend).then(async (msgSent) => {
					const thread = await channel.threads?.create({
						name: ticketID,
					});
					if (thread) {
						await thread.members?.add(message.author.id);
						await thread.send(msgSent.content);
					}
					this.delete(message);
					message.channel
						.send(`${this.e.r} Added todo with **ID ${ticketID}**!`)
						.then((msg) => this.delete(msg, 5));
				});
			}
		}, 2000);
	}

	async channelFetch(
		channel = new Discord.Channel(),
		args = [],
		replace = this.e.on,
		callback = () => {}
	) {
		channel.messages
			.fetch({
				limit: 10,
			})
			.then(async (msgs) => {
				// this.InLog(msgs);
				msgs.forEach(async (msg) => {
					if (msg.partial) {
						msg
							.fetch()
							.then(async (fullMsg) => {
								if (
									fullMsg.author.id == this.client.user.id &&
									fullMsg.content.includes(`${this.e.tic}${args[0]}`)
								) {
									if (replace == "delete") {
										this.delete(msg);
										const ticketId = args[0];
										const thread = await channel.threads?.cache.find((th) =>
											th.name.includes(ticketId)
										);
										if (thread) {
											await thread.delete();
										}
									}
									if (replace == this.e.on) {
										const ticketId = args[0];
										const thread = await channel.threads?.cache.find((th) =>
											th.name.includes(ticketId)
										);
										if (thread) {
											await thread.setArchived(true);
										}
									}
									if (replace == this.e.off || replace == this.e.idle) {
										const ticketId = args[0];
										const thread = await channel.threads?.cache.find((th) =>
											th.name.includes(ticketId)
										);
										if (thread) {
											await thread.setArchived(false);
										}
									}
									fullMsg.edit(this.replace(msg, replace));
									return;
								}
							})
							.catch((err) => {
								new Err(err, err.code || "FETCHERR", {
									err,
									msg,
									msgs,
								});
							});
					} else {
						if (
							msg.author.id == this.client.user.id &&
							msg.content.includes(`${this.e.tic}${args[0]}`)
						) {
							if (replace == "delete") {
								this.delete(msg);
								const ticketId = args[0];
								const thread = await channel.threads?.cache.find((th) =>
									th.name.includes(ticketId)
								);
								if (thread) {
									await thread.delete();
								}
							}
							if (replace == this.e.on) {
								const ticketId = args[0];
								const thread = await channel.threads?.cache.find((th) =>
									th.name.includes(ticketId)
								);
								if (thread) {
									await thread.setArchived(true);
								}
							}
							if (replace == this.e.off || replace == this.e.idle) {
								const ticketId = args[0];
								const thread = await channel.threads?.cache.find((th) =>
									th.name.includes(ticketId)
								);
								if (thread) {
									await thread.setArchived(false);
								}
							}
							msg.edit(this.replace(msg, replace));
							return;
						}
					}
				});
			})
			.then(callback(null))
			.catch((err) => {
				if (err) callback(err);
			});
	}

	replace(msg, replace) {
		// return msg.content.split(this.e.off).join("").split(this.e.idle).join("").split(this.e.on).join(replace);
		const content = msg.content;
		if (content.includes(this.e.off)) {
			return content.split(this.e.off).join(replace);
		}
		if (content.includes(this.e.on)) {
			return content.split(this.e.on).join(replace);
		}
		if (content.includes(this.e.idle)) {
			return content.split(this.e.idle).join(replace);
		}
	}

	padNum(num, size) {
		let s = num + "";
		while (s.length < size) s = "0" + s;
		return s;
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
	args: ["<todo>"],
	permissions: ["DEV"],
	cooldown: 3,
	color: "RANDOM",
	extraFields: [],
	help: `<prefix>todo <todo>`,
	call: async (message, client) => {
		if (!instance.initiated) instance.init(client);
		instance.call(message);
	},
};
