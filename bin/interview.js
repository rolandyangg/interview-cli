#!/usr/bin/env node

/* SETUP */

// Child Process
const cp = require('child_process');

// Inquirer
const inquirer = require('inquirer');
const inquirerloop = require('inquirer-loop');
inquirer.registerPrompt("loop", require("inquirer-loop")(inquirer));

// Database
const firebase = require('firebase/app');
require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDjIsj_l3YIC8USqx10ogINQ5oEIYjoKFo",
    authDomain: "cliapplication.firebaseapp.com",
    projectId: "cliapplication",
    storageBucket: "cliapplication.appspot.com",
    messagingSenderId: "1084293097407",
    appId: "1:1084293097407:web:68b898be2edf7418a3a30a",
    measurementId: "G-DFHHBEK47Q"
};

firebase.initializeApp(firebaseConfig);
const DATABASE = firebase.firestore();
DATABASE.settings({
    timestampsInSnapshots: true
});

/* BODY */

console.clear();

// Check to see if their code is valid
inquirer
    .prompt([{
        type: 'input',
        name: 'code',
        message: 'Enter your interview code: ',
        mask: true
    }])
    .then(answers => {
        if (answers.code === "") // safe guard against error
            answers.code = " ";
        DATABASE.collection('sessions').doc(answers.code).get().then((data) => {
            if (data.data() != null) { // check if it exists
                var docdata = data.data();
                // console.log("Data:" + docdata);
                if (docdata.currentQuestion != 0) { // already has started
                    var timeLeft = docdata.endTime.toDate().getTime() - new Date().getTime()
                    if (timeLeft < 0 && docdata.submitTime == null) {
                        console.log("Your time ran up, submitting your interview...\n");
                        endInterview(answers.code);
                    } else if (timeLeft < 0 || docdata.submitTime != null) { // interview is over
                        console.log("Your interview has already finished. You may not go back.")
                        process.exit();
                    } else {
                        console.log(`Welcome back ${docdata.name}! You have ${msToTime(timeLeft)} time left`) // ADD IN HOW MUCH TIME IS LEFT
                        askQuestion(answers.code, docdata.currentQuestion); // resume interview
                    }
                } else {
                    startInterview(answers.code); // initiate and confirm the interview
                }
            } else {
                console.log("Invalid code! Please try again or contact an admin for further assistance.");
                process.exit();
            }
        })
    })
    .catch(error => {
        console.log(error);
    });

/**
 * Asks the user if they are sure they want to start their interview before continuing
 * @param {*} code 
 */
function startInterview(code) {
    DATABASE.collection('sessions').doc(code).get().then((data) => { // Assume that code works
        let docdata = data.data();
        inquirer
            .prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Hello ${docdata.name}!\nWelcome to your coding interview!\nYou may submit your code in the following formats: Java, Python, JS, C, C++\nAny other formats will not be supported\n\nYou will have ${docdata.hoursGiven} hours and ${docdata.minutesGiven} minutes to complete this interview\nWe will re-ask for your name and email to confirm and then a timer will begin\nOnce you begin the interview, the timer will start and will not pause.\nDo you want to proceed?`,
            }])
            .then(answers => {
                if (answers.confirm) {
                    var endTime = new Date();
                    endTime.setHours(endTime.getHours() + docdata.hoursGiven);
                    endTime.setMinutes(endTime.getMinutes() + docdata.minutesGiven);
                    var currTime = new Date();
                    DATABASE.collection('sessions').doc(code).update({
                        startTime: currTime,
                        endTime: endTime,
                        currentQuestion: 1
                    })
                    askQuestion(code, 1); // begin
                } else {
                    console.clear();
                    console.log("Come back soon!");
                    process.exit();
                }
            })
            .catch(error => {
                console.log(error);
            });
    })
}

/**
 * Asks the user their interview question and runs tests
 * @param {*} code 
 * @param {*} currentQuestion 
 */
function askQuestion(code, currentQuestion) {
    DATABASE.collection('questions').where('question', '==', currentQuestion).get().then((data) => {
        if (data.docs.length != 0) { // question exists
            var docdata = data.docs[0].data();
            console.log(`\nQuestion #${currentQuestion}: ${docdata.name}\nDifficulty: ${docdata.difficulty}\n\n${docdata.description}\nEx. ${docdata.testInput[0]} -> ${docdata.testOutput[0]}\n`); // Ask question
            // Give choices
            inquirer
                .prompt([{
                    type: 'rawlist',
                    name: 'choice',
                    message: 'What would you like to do?',
                    choices: ['Run Tests', 'Check Time Left', 'Exit']
                }])
                .then(answers => {
                    console.clear();
                    var answer = answers.choice;
                    if (answer === 'Run Tests') {
                        askTests(code, currentQuestion);
                    } else if (answer === 'Check Time Left') {
                        DATABASE.collection('sessions').doc(code).get().then((data) => { // Assume that the code works
                            var docdata = data.data();
                            var timeLeft = docdata.endTime.toDate().getTime() - new Date().getTime();
                            console.log(`You have ${msToTime(timeLeft)} time left`);
                            if (timeLeft < 0) {
                                console.log("Your time ran up, submitting your interview...\n");
                                endInterview(answers.code);
                            } else {
                                askQuestion(code, currentQuestion);
                            }
                        })
                    } else if (answer === 'Exit') { // IMPLEMENT SCORE CHECK HERE
                        console.log("Goodbye!");
                        process.exit();
                    }
                })
                .catch(error => {
                    console.log(error);
                });
        } else { // the current question does not exist therefore the interview is over TODO: Accomodate questions that are selected individually
            endInterview(code);
        }
    })
}

/**
 * Asks the user what tests they would like to run
 * @param {*} code 
 * @param {*} currentQuestion 
 */
function askTests(code, currentQuestion) {
    inquirer
        .prompt([{
            type: 'rawlist',
            name: 'choice',
            message: 'What language would you like to run the tests on?',
            choices: ['Java', 'Python', 'Javascript', 'C', 'C++']
        }])
        .then(answers => {
            console.clear();
            var answer = answers.choice;
            switch (answer) {
                case "Java":
                    cp.exec('javac', ['./answers/answer.java']); // compile java code, potentially won't compile correctly and may need second run because not synchronous?
                    runTests("java", "./answers/answer.java", code, currentQuestion);
                    break;
                case "Python":
                    runTests("python", "./answers/answer.py", code, currentQuestion);
                    break;
                case "Javascript":
                    runTests("node", "./answers/answer.js", code, currentQuestion);
                    break;
                case "C":
                    cp.exec('gcc', ['./answers/answer.c', '-o', 'answerc']); // compile
                    runTests("./answerc", "", code, currentQuestion);
                    break;
                case "C++":
                    cp.exec('g++', ['./answers/answer.cpp', '-o', 'answercp']); // compile
                    runTests("./answercp", "", code, currentQuestion);
                    break;
                default:
                    console.log("Wuh woh error"); // lol fun error hopefully this doesn't occur
            }
        })
        .catch(error => {
            console.log(error);
        });
}

/**
 * Actually runs the tests on the user's code and reports back the results
 * @param {*} code 
 * @param {*} currentQuestion 
 */
function runTests(language, filepath, code, currentQuestion) {
    DATABASE.collection('questions').where('question', '==', currentQuestion).get().then((data) => {
        var docdata = data.docs[0].data();
        var caseNum = 0; // the test case number
        var score = 0; // score they earned
        var testCaseResults = ""; // detailed test case results
        // run regular test cases
        for (let i = 0; i < docdata.testInput.length; i++) {
            let input = docdata.testInput[i];
            let userResult = cp.spawnSync(language, [filepath, input], {
                encoding: 'utf8'
            }).stdout.trim();
            let realResult = docdata.testOutput[i];
            console.log(`Test Case #${++caseNum}: ${input} -> ${userResult} Expected: ${realResult} (${userResult === realResult ? "PASSED" : "FAILED"})`);
            // update scores
            if (userResult === realResult) {
                score++;
                testCaseResults = testCaseResults + "1";
            } else {
                testCaseResults = testCaseResults + "0";
            }
        }
        // run hidden test cases
        for (let i = 0; i < docdata.hiddenInput.length; i++) {
            let input = docdata.hiddenInput[i];
            let userResult = cp.spawnSync(language, [filepath, input], {
                encoding: 'utf8'
            }).stdout.trim();
            let realResult = docdata.hiddenOutput[i];
            console.log(`Test Case #${++caseNum}: HIDDEN -> HIDDEN Expected: HIDDEN (${userResult === realResult ? "PASSED" : "FAILED"})`);
            // update scores
            if (userResult === realResult) {
                score++;
                testCaseResults = testCaseResults + "1";
            } else {
                testCaseResults = testCaseResults + "0";
            }
        }
        // present score and ask
        inquirer
            .prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `You received a score of ${score}/${testCaseResults.length}\nWould you like to submit this score?\n(NOTE: Once you submit you can not go back)`,
            }])
            .then(answers => {
                if (answers.confirm) {
                    submitQuestion(code, currentQuestion, testCaseResults);
                } else {
                    askQuestion(code, currentQuestion); // go back into a loop
                }
            })
            .catch(error => {
                console.log(error);
            });
    })
}

/**
 * Updates the data on the firestore
 * @param {*} code 
 * @param {*} currentQuestion 
 * @param {*} results 
 */
function submitQuestion(code, currentQuestion, results) {
    console.clear();
    DATABASE.collection('sessions').doc(code).get().then((data) => {
        var docdata = data.data();
        var timeLeft = docdata.endTime.toDate().getTime() - new Date().getTime();
        if (timeLeft < 0) { // Do not go through with the submission because time ran out
            console.log("Your time ran up, submitting your interview...\n");
            endInterview(answers.code);
        } else { // There is still time submit the results
            var newResults = docdata.results;
            newResults.push(results);
            console.log("Submitting...");
            currentQuestion++;
            DATABASE.collection('sessions').doc(code).update({
                currentQuestion: currentQuestion,
                results: newResults
            })
            console.log("Submitted!\n");
            askQuestion(code, currentQuestion);
        }
    })
}

/**
 * Ends the interivew for the given code
 * @param {*} code 
 */
function endInterview(code) {
    var time = new Date();
    DATABASE.collection('sessions').doc(code).update({ // Submit time
        submitTime: time
    })
    DATABASE.collection('sessions').doc(code).get().then((data) => {
        var points = 0;
        var docdata = data.data();
        for (let i = 0; i < docdata.results.length; i++) {
            for (let z = 0; z < docdata.results[i].length; z++) {
                if (docdata.results[i].substring(z, z + 1) === "1")
                    points++;
            }
        }
        DATABASE.collection('questions').get().then((data2) => { // Get the maximum possible score
            var maxPoints = 0;
            data2.docs.forEach(doc => {
                let docdata2 = doc.data();
                maxPoints += docdata2.testOutput.length;
                maxPoints += docdata2.hiddenOutput.length;
            });
            console.log(`Great job ${docdata.name}!\nYou had a final score of ${points}/${maxPoints}!\nMore in depth results will be sent to you and your admin.\nIf you have any further questions feel free to reach out!`);
            process.exit();
        })
    })
}

/**
 * Credits to https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
 * Converts milliseconds to a readable time
 * @param {*} duration 
 * @returns 
 */
function msToTime(duration) {
    var seconds = Math.floor((duration / 1000) % 60);
    var minutes = Math.floor((duration / (1000 * 60)) % 60);
    var hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}