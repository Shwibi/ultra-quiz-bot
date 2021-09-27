const { User } = require("discord.js");
const mongoose = require("mongoose");
const { Err } = require("shwi-js");
const sleep = require("../utils/Wait");

class UserManager {
	static UserTemplate = {
		userId: "string",
		userTag: "string",
		isPremium: false,
	};
	constructor() {
		this.model = require("../models/Users");
		this.cache = {};
	}

	/**
	 *
	 * @param {User} user
	 * @returns {mongoose.Document}
	 */
	async create(user) {
		const userId = user.id;
		const userTag = user.tag;
		const isPremium = false;
		const doc = await this.model.create({ userId, userTag, isPremium });
		console.log(`Created a new user: ${user.tag} | ${user.id}`);
		return doc;
	}

	/**
	 *
	 * @param {String} id
	 * @returns {mongoose.Document}
	 */
	async fetch(id) {
		const fetched = await this.model.findOne({ userId: id });
		return fetched;
	}

	/**
	 *
	 * @param {String} id
	 * @returns {mongoose.Document}
	 */
	async find(id) {
		if (this.cache[id]) return this.cache[id];
		const fetched = await this.fetch(id);
		this.cache[id] = fetched;
		return fetched;
	}

	/**
	 *
	 * @param {String} id
	 * @returns {mongoose.Document}
	 */
	async makePremium(id, changeTo = true) {
		let userDoc = await this.find(id);
		if (!userDoc) {
			return new Err("User does not exist in db!", "INVUSER", { id });
		}
		await userDoc.updateOne({ isPremium: changeTo });
		await sleep(2000);
		const newDoc = await this.fetch(id);
		this.cache[id] = newDoc;
		console.log({ message: `User premium: ${changeTo}`, newDoc });
		return userDoc;
	}
}

module.exports = {
	UserManager,
	Um: new UserManager(),
};
