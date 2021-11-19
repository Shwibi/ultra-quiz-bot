// Quiz model
const Main = require("../utils/Main");
const { Err, IsInteger } = require("shwi-js");
const RandomInt = require("shwi-js/Functions/Generator/RandomInt");

// Question
class Question extends Main {
  /**
   *
   * @param {String} question
   * @param {String} type Type of question: mcq|text|tf (true or false)
   */
  constructor(question, type) {
    super(`question`);

    this.question = question;
    this.type = type.toLowerCase();
    this.time = this.config.Bot.default_question_time; // Time is in seconds
    if (this.type == "mcq")
      this.options = [{ answer: "", isCorrect: false, id: 0 }].filter(
        (opt) => opt.id !== 0
      );
    this.correctAnswers = [{ id: 0, answer: "" || true || false }].filter(
      (ca) => ca.id !== 0
    );
  }

  /**
   * Add an option to this question
   * @param {String} option
   * @param {Boolean} status
   */
  addOption(option, isCorrect) {
    if (this.type !== "mcq") {
      return new Err(
        "Question must be of type MCQ to add an option!",
        "INVQST",
        { question: this, dont_log: true }
      );
    }
    const optObject = {
      answer: option,
      isCorrect,
      id: this.options.length + 1,
    };
    this.options.push(optObject);
    if (isCorrect) this.correctAnswers.push(optObject);
    return this;
  }

  /**
   *
   * @param {String} answer
   */
  setTextAnswer(answer) {
    if (this.type !== "text")
      return new Err("Question must be of type text!", "INVQST", {
        question: this,
        answerProvided: answer,
      });

    this.correctAnswers.push({ id: 1, answer: answer });
    return this;
  }

  /**
   *
   * @param {Boolean} answer
   */
  setTfAnswer(answer) {
    if (this.type !== "tf")
      return new Err("Question must be of type true or false!", "INVQST", {
        question: this,
        answerProvided: answer,
      });

    this.correctAnswers.push({ id: 1, answer: answer });
    return this;
  }

  get question_details() {
    const question = {
      question: this.question,
      type: this.type,
      answer: this.correctAnswer,
    };
    if (this.type == "mcq") {
      let isCor = false;
      this.options.forEach((opt) => {
        if (opt.isCorrect) isCor = true;
      });
      if (!isCor)
        return new Err(
          "No Correct option found for given question!",
          "INVQST",
          { question: this }
        );
      question.options = this.options.filter((o) => o.id !== 0);
    }

    return question;
  }

  /**
   * @param {Number} timeInSeconds
   */
  setTime(timeInSeconds) {
    if (!IsInteger(timeInSeconds))
      return new Err("Time provided is not an integer!", "INVALID TIME", {
        timeInSeconds,
      });

    if (timeInSeconds > this.config.Bot.max_question_time)
      return new Err("Time must be smaller than max time!", "TIME TOO BIG", {
        conf: this.config,
        timeInSeconds,
      });
    this.time = timeInSeconds;
    return this;
  }
}

// Quiz
class Quiz extends Main {
  constructor(name) {
    super(`quiz-${name}`);
    this.id = RandomInt(500, 1500);
    this.questions = [];
    this.leaderboard = [
      {
        userId: 123,
        count: 123,
        time: 123, // in milliseconds
        correct: [0, 0, 0], // question ids correct
        wrong: [0, 0, 0], // question ids incorrect
      },
    ];
  }

  /**
   *
   * @param {Number} id
   * @returns {Quiz}
   */
  setId(id) {
    this.id = id;
    return this;
  }

  /**
   *
   * @param {String} name
   * @returns {Quiz}
   */
  setName(name) {
    this.name = name;
    return this;
  }

  /**
   *
   * @param {Question} question
   */
  addQuestion(question) {
    const qn = this.questions.length + 1;
    const obj = { id: qn };
    for (key in question.question) {
      obj[key] = question.question[key];
    }
    return this;
  }

  get sortedLbd() {
    const lbd = this.leaderboard;
    const sortedByTime = lbd.sort((a, b) => a.time - b.time);
    const sortedByCorrect = sortedByTime.sort((a, b) => b.count - a.count);
    return sortedByCorrect;
  }
}

module.exports = { Question, Quiz };
