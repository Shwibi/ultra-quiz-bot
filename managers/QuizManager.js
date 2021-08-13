const mongoose = require("mongoose");

class QuizManager {
	static QuizTemplate = {
		name: "",
		quizId: 2,
		quizDetails: QuizManager.QuizDetailsTemplate,
		completed: false,
		leaderboard: [],
		creator: "",
	};

	static QuizDetailsTemplate = [
		{
			question: "",
			options: [QuizManager.OptionTemplate],
			time: 30 * 1000,
			image: "",
		},
	];

	static OptionTemplate = {
		name: "",
		status: "",
	};

	constructor() {
		this.QuizModel = require("../models/Quiz");
		this.cache = {};
	}

	/**
	 * Get a quiz from either the cache or the database!
	 * @param {Number} quizId
	 * @returns {QuizManager.QuizDetails} Quiz document
	 */
	async Get(quizId) {
		if (this.cache[quizId]) return this.cache[quizId];

		// Fetch then add to cache
		const FetchQuiz = this.Fetch(quizId);
		if (FetchQuiz) {
			const QuizDetails = await FetchQuiz.get("quizDetails");
			this.cache[quizId] = FetchQuiz;
			return QuizDetails;
		} else return;
	}

	/**
	 * Fetch a quiz from database
	 * @param {Number} quizId
	 * @returns {mongoose.Query} Fetched document
	 */
	async Fetch(quizId) {
		const fetchedQuiz = await this.FindOne({ quizId: quizId });
		return fetchedQuiz;
	}

	/**
	 * Find a quiz from database
	 * @param {QuizManager.QuizTemplate} Quiz
	 * @returns {mongoose.Query} Fetched document
	 */
	async FindOne(Quiz) {
		const { quizId, name } = Quiz;
		let fetched;
		if (quizId) fetched = await this.QuizModel.findOne({ quizId });
		if (name) fetched = await this.QuizModel.findOne({ name });
		return fetched;
	}

	/**
	 * Create a new quiz!
	 * @param {QuizManager.QuizTemplate} Quiz
	 * @returns {mongoose.Query} Database document
	 */
	async Create(Quiz) {
		let QuizSetter = await this.Fetch(150);
		if (!QuizSetter) {
			QuizSetter = await this.QuizModel.create({
				quizId: 150,
				quizDetails: "200",
				creator: "2",
			});
		}
		console.log(QuizSetter);

		const PreviousCount = await QuizSetter.get("quizDetails");
		console.log({ PreviousCount });
		let NewCount = parseInt(PreviousCount) + 1;
		if (isNaN(NewCount)) NewCount = 300;
		Quiz.quizId = NewCount;
		this.UpdateOne(QuizSetter, { quizDetails: `${NewCount}` });
		const Document = await this.QuizModel.create(Quiz);
		this.cache[Quiz.quizId] = Document;
		return Document;
	}

	/**
	 *
	 * @param {mongoose.Query} quizToUpdate
	 * @param {QuizManager.QuizTemplate} updateDetails
	 * @returns {mongoose.Query} Updated document
	 */
	async UpdateOne(quizToUpdate, updateDetails) {
		const QuizID = quizToUpdate.get("quizId");
		await quizToUpdate.updateOne(updateDetails);
		const NewDocument = await this.Fetch(QuizID);
		return NewDocument;
	}

	/**
	 * Get the total size of the quiz model
	 * @returns {Number} Error OR Count
	 */
	async size() {
		let TotalSize;
		await this.QuizModel.countDocuments((err, count) => {
			if (err) TotalSize = err;
			else TotalSize = count - 1;

			return TotalSize;
		});
		return TotalSize;
	}
}

const Qm = new QuizManager();
module.exports = { QuizManager, Qm };
