const { Err } = require("shwi-js");
const msToTime = require(`./msToTime`);

const REQUIRED_ITEMS = ["-question", "-options", "+o", "+c"];
const REQ_OPT = ["+o", "+c"];
const MAX_OPTIONS = 5;
const MIN_TIME = 1 * 1000;
const MAX_TIME = 20 * 60 * 1000;
const PREMIUM_MAX_TIME = 24 * 60 * 60 * 1000;

// Example
const EXAMPLE = `

-question Hello there
-options +o No +c Okay +o Okay
-time 10

-question Nope
-question YEAHH
-options
-time 10000000

-question Alright
-options +o Nope
-=-

`;

const OPTION_EXAMPLE = `
+o Nope +c Okay +o Okay? +o ---Ooohh---?!2hr8271#R*#!g7
`;

function CheckForRequired(toCheck = EXAMPLE, overlookQuestion = false) {
	toCheck = toCheck.trim().toLowerCase();

	let returner = true;
	REQUIRED_ITEMS.forEach((req_item) => {
		if (!toCheck.includes(req_item)) {
			if (req_item == "-question") {
				if (!overlookQuestion) returner = false;
			} else returner = false;
		}
	});

	return returner;
}

function CheckValidOptions(toCheck = OPTION_EXAMPLE) {
	toCheck = toCheck.trim().toLowerCase();
	let returner = true;
	REQ_OPT.forEach((req_opt) => {
		if (!toCheck.includes(req_opt)) {
			returner = false;
		}
	});
	return returner;
}

function Parse(
	contentToParse = EXAMPLE,
	callback = (err = new Err(), parsed = []) => {},
	isPremium
) {
	let ParsedArray = [];

	if (!CheckForRequired(contentToParse))
		return callback(
			new Err(
				`Required items are missing or invalid format Make sure you have a question, a wrong option, AS WELL AS A CORRECT ONE!`,
				"REQC",
				{
					contentToParse,
					REQUIRED_ITEMS,
					dont_log: true,
				}
			),
			null
		);

	const RawQuestionDataArray = contentToParse.split("-question").slice(1);

	for (
		let raw_questions_index = 0;
		raw_questions_index < RawQuestionDataArray.length;
		raw_questions_index++
	) {
		let ParsedQuestion = {
			question: "",
			options: [],
			time: 30,
			image: "",
		};

		const RawQuestionData = RawQuestionDataArray[raw_questions_index];

		// Check for all things
		if (!CheckForRequired(RawQuestionData, true))
			return callback(
				new Err(
					`Required items are missing or invalid format Make sure you have a question, a wrong option, AS WELL AS A CORRECT ONE!`,
					"REQM",
					{
						RawQuestionData,
						REQUIRED_ITEMS,
						dont_log: true,
					}
				),
				null
			);

		// Parse the question
		const RawOptSplit = RawQuestionData.split(/\-options/i);
		const Question = RawOptSplit.shift();
		ParsedQuestion.question = Question.trim();

		const RawOptData = RawOptSplit.join("");

		const OptData_TimeSplit = RawOptData.split(/\-time/i);
		const OptionsData = OptData_TimeSplit.shift();
		const RawTimeData = OptData_TimeSplit.join("");

		if (!CheckValidOptions(OptionsData)) {
			return callback(
				new Err(
					`Required options are missing or invalid option format!`,
					"REQO",
					{ OptionsData, REQ_OPT, dont_log: true }
				),
				null
			);
		}

		const OptionsData_OptSplit = OptionsData.split(/\+[oc]/i).slice(1);

		if (OptionsData_OptSplit.length > MAX_OPTIONS)
			return callback(
				new Err("A question cannot have more than 5 options!", "EXCOPT", {
					dont_log: true,
					OptionsData_OptSplit,
				}),
				null
			);

		// Find the correct answer
		const CorrectAnswerRawArray = OptionsData.split(/\+c/i);
		if (CorrectAnswerRawArray.length > 2)
			return callback(
				new Err(`A question cannot have multiple answers!`, "MULT", {
					CorrectAnswerRawArray,
					OptionsData_OptSplit,
				}),
				null
			);

		const CorrectAnswerRaw = CorrectAnswerRawArray[1];
		const CorrectAnswerRaw_End = CorrectAnswerRaw.toLowerCase().includes("+o")
			? CorrectAnswerRaw.toLowerCase().indexOf("+o")
			: CorrectAnswerRaw.length;
		const CorrectAnswer = CorrectAnswerRaw.substr(0, CorrectAnswerRaw_End);
		if (CorrectAnswer.length == 0)
			return callback(
				new Err(`Correct answer cannot be empty!`, "EMPTY", {
					CorrectAnswer,
					CorrectAnswerRaw,
				}),
				null
			);

		// Push all options
		OptionsData_OptSplit.forEach((Option) => {
			const OptionInfo = {
				name: Option.trim(),
				status: "o",
			};
			if (CorrectAnswer.trim().toLowerCase() == Option.trim().toLowerCase())
				OptionInfo.status = "c";
			ParsedQuestion.options.push(OptionInfo);
		});

		// Get time
		const RawTimeData_ImageSplit = RawTimeData.split(/\-image/i);
		const TimeData = RawTimeData_ImageSplit.shift() || ParsedQuestion.time;
		const RawImageData = RawTimeData_ImageSplit.join("");

		if (isNaN(parseFloat(TimeData)))
			return callback(
				new Err(`Invalid time provided!`, "INVTIME", {
					dont_log: true,
					RawTimeData_ImageSplit,
				}),
				null
			);

		const max_time = isPremium ? PREMIUM_MAX_TIME : MAX_TIME;
		const ParsedTimeData = parseFloat(TimeData) * 1000;
		if (ParsedTimeData < MIN_TIME || ParsedTimeData > max_time)
			return callback(
				new Err(
					`Time provided is either too small or too big! Limit is Between ${msToTime(
						MIN_TIME
					)} to ${msToTime(max_time)}!`,
					"INVTIME",
					{ ParsedTimeData, MIN_TIME, max_time }
				),
				null
			);
		ParsedQuestion.time = ParsedTimeData;

		// Get image
		if (RawImageData.length > 0) {
			ParsedQuestion.image = RawImageData.trim();
		}

		// Push parsed question into question array!
		ParsedArray.push(ParsedQuestion);
	}

	// Finally, return the parsed array!
	return callback(null, ParsedArray);
}

module.exports = Parse;
