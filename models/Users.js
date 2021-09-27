const { entryInstance } = require(`../index`);
const reqString = { type: String, required: true };
const unreqString = { type: String, required: false };
const UsersSchema = new entryInstance.mongoose.Schema({
	userTag: reqString,
	userId: reqString,
	isPremium: { type: Boolean, default: false, required: false },
});
module.exports = entryInstance.mongo.model("BotUsers", UsersSchema);
