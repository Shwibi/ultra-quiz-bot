const Main = require("../utils/Main");
const shwijs = require("shwi-js");
const { Question, Quiz } = require("./quiz_classes");
const Err = shwijs.Err;
// Structure
/**
 *
 * -question What is 1 + 1 = ?
 * -type mcq
 * -options +o 1 +c 2 +o 11 +o 0
 * -time 50
 *
 * -question What is your name?
 * -type text
 * -time 25
 *
 * -question Are you okay?
 * -type tf
 * -time 30
 *
 */

/**
 *
 * @param {String[]} REQUIRED_ITEMS
 * @param {String} content
 * @returns {{val: Boolean, err: Err}}
 */
function checkReq(REQUIRED_ITEMS, content) {
  // check if all required arguments are present
  REQUIRED_ITEMS.forEach((item) => {
    if (!content.toLowerCase().includes(item))
      return {
        val: false,
        err: new Err(`Req item ${item} is missing.`, "ITEMS_MISSING", {
          content: content,
          REQUIRED_ITEMS,
        }),
      };
  });
  return { val: true };
}

/**
 * Parse a content to create a quiz!
 * @param {String} content The content to parse
 */
function Parse(content) {
  // Required arguments for content
  const REQUIRED_ITEMS = [];
  const check = checkReq(REQUIRED_ITEMS, content);
  if (!check.val) return check.err;

  // now, split the content into different questions
  const split_into_questions = content.split(/\-question/gi);
  // console.log(split_into_questions);
  // Now run through each question and parse it
  for (let q = 0; q < split_into_questions.length; q++) {
    if (["", "\n"].includes(split_into_questions[q])) continue;
    parseQuestion(split_into_questions[q]);
  }
}

/**
 * @param {String} question
 */
function parseQuestion(question) {
  // check for required params
  const REQUIRED_PARTS = ["-type"];
  const check = checkReq(REQUIRED_PARTS, question);
  if (!check.val) return check.err;

  // now split using -options*
  const split_by_type = question.split(/\-type/);

  // get the question from split by type
  const question_text = split_by_type[0].trim().replace(/\n/gi, "");

  // now check for other options by first splitting into newlines
  const type2 = split_by_type[1].trim();
  const newline_split = type2.split(/\n/);
  const type = newline_split[0].toLowerCase().trim();
  const non_type = newline_split.slice(1).join("\n").trim();

  // Create question class
  const questionClass = new Question(question_text, type);

  // Logging
  // console.log({
  //   split_by_type,
  //   question_text,
  //   type2,
  //   newline_split,
  //   type,
  //   non_type,
  // });

  // match type
  switch (type) {
    case "mcq": {
      // We got mcqs! Check for options
      const check_opt = checkReq(["-options", "+o", "+c"], non_type);
      if (!check_opt.val) return check_opt.err;

      // split by options
      let split_by_options = non_type.split(/\-options/gi);
      split_by_options = split_by_options.filter((sbo) => sbo !== "");

      // const non_opts = split_by_options.slice(1).join("\n");

      // get the options
      let options = split_by_options[0].trim();

      const split_by_time = options
        .split(/-time/gi)
        .filter((t) => t !== "" && t !== "\n")
        .map((t) => t.trim());
      options = split_by_time[0].trim();

      // get the time & set it
      const time = split_by_time[1].trim();
      if (time) {
        // Check if time is integer
        const timeInt = parseInt(time);
        if (!shwijs.IsInteger(timeInt))
          return new Err("Time mentioned is not a number!", "TIME NAN", {
            time,
            question,
          });

        questionClass.setTime(parseInt(time));
      }

      // split by +
      const optionsSplit = options
        .split(/\+/)
        .filter((opt) => opt !== "")
        .map((opt) => opt.trim());

      console.log({
        options,
        split_by_options,
        question_text,
        type,
        optionsSplit,
        split_by_time,
        time,
      });

      // now get each option
      optionsSplit.forEach((opt) => {
        if (opt.toLowerCase().startsWith("c")) {
          // Correct option
          questionClass.addOption(opt.substr(1, opt.length).trim(), true);
        } else {
          // Incorrect option
          questionClass.addOption(opt.substr(1, opt.length).trim(), false);
        }
      });
      console.log({ opts: questionClass.options });
      break;
    }
    case "text": {
      const check_ans = checkReq(["-answer"], non_type);
      if (!check_ans.val) return check_opt.err;
      // Get answer
      const answer_split = non_type
        .trim()
        .split(/-answer/gi)
        .filter((a) => a !== "" && a !== "\n")
        .map((a) => a.trim());

      const time_split = answer_split[0]
        .split(/-time/gi)
        .filter((t) => t !== "" && t !== "\n")
        .map((t) => t.trim());
      const answer = time_split[0].trim();
      const time = time_split[1].trim();
      if (time) {
        // Check if time is integer
        const timeInt = parseInt(time);
        if (!shwijs.IsInteger(timeInt))
          return new Err("Time mentioned is not a number!", "TIME NAN", {
            time,
            question,
          });

        questionClass.setTime(parseInt(time));
      }
      questionClass.setTextAnswer(answer);
      console.log({ answer_split, time_split, answer, time });
      break;
    }
    case "tf": {
      // True or false!
      const check_ans = checkReq(["-answer"], non_type);
      if (!check_ans.val) return check_opt.err;
      // Get answer
      const answer_split = non_type
        .trim()
        .split(/-answer/gi)
        .filter((a) => a !== "" && a !== "\n")
        .map((a) => a.trim());

      const time_split = answer_split[0]
        .split(/-time/gi)
        .filter((t) => t !== "" && t !== "\n")
        .map((t) => t.trim());
      const answer = time_split[0].trim();
      const time = time_split[1].trim();
      if (time) {
        // Check if time is integer
        const timeInt = parseInt(time);
        if (!shwijs.IsInteger(timeInt))
          return new Err("Time mentioned is not a number!", "TIME NAN", {
            time,
            question,
          });

        questionClass.setTime(parseInt(time));
      }
      switch (answer.toLowerCase()) {
        case "true": {
          // Answer is true!
          questionClass.setTfAnswer(true);
          break;
        }
        case "false": {
          // Answer is false!
          questionClass.setTfAnswer(false);
          break;
        }
        case "t": {
          // Answer is true!
          questionClass.setTfAnswer(true);
          break;
        }
        default: {
          // Answer is false!
          questionClass.setTfAnswer(false);
          break;
        }
      }
      break;
    }
    default: {
      // Do nothing... lol
    }
  }

  console.log(JSON.stringify(questionClass, null, 2));
}

module.exports = { Parse };

// Testing
Parse(`
-question HELLO THERE
-type text
-answer THIS IS MY ANSWER
-time 56

-question Is 1 + 1 = 3?
-type tf
-answer false
-time 23
`);
