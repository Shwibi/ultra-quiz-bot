const { Message } = require("discord.js");
const { entryInstance } = require(`../index`);
const reqString = { type: String, required: true };
const unreqString = { type: String, required: false };
const QuizRunningSchema = new entryInstance.mongoose.Schema({
	quizId: reqString,
	messageId: reqString,
	questionNumber: reqString,
	message: { type: Object, required: true },
	completed: { type: Boolean, required: true, default: false },
	crossboard: { type: Array, required: true },
	timeRemaining: { type: Number, required: true },
	channelId: { type: String, required: true },
	answeredUsers: { type: Array, required: true },
	collectedUsers: { type: Array, required: true },
});
module.exports = entryInstance.mongo.model("QuizRunning", QuizRunningSchema);
