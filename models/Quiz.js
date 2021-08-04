const { entryInstance } = require(`../index`);
const config = require(`../store/config.json`);
const reqString = { type: String, required: true };
const unreqString = { type: String, required: false }
const QuizSchema = new entryInstance.mongoose.Schema({
  name: unreqString,
  quizId: { type: Number, required: true },
  quizDetails: { type: Array, required: true },
  completed: { type: Boolean, required: true, default: false },
  leaderboard: { type: Array, required: false },
  creator: reqString
})
module.exports = entryInstance.mongo.model('Quiz', QuizSchema);