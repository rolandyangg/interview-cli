#!/usr/bin/env node

/* SETUP */

// Variables
const PASSWORD = "password"

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

// Email
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'clicodeinterview@gmail.com', // remove credentials later, this is temporary
        pass: 'ZaVF((^m-3S@%{*?'
    }
})

/* BODY */

/*
TODO:
Allow admin to manage and view sessions
Allow admin to manage and view questions
Email user code to enter into the system
Catch Invalid Inputs
*/

// Prompt the user asking for a password to make sure they are allowed to access the admin control panel
console.clear();

inquirer
    .prompt([{
        type: 'password',
        name: 'password',
        message: 'Enter the password: ',
        mask: true
    }])
    .then(answers => {
        console.clear();
        if (answers.password === PASSWORD) {
            console.log("Welcome Admin!\n")
            menu();
        } else {
            console.log("Incorrect password!");
        }
    })
    .catch(error => {
        console.log(error);
    });

/**
 * Menu for when user enters the admin control panel
 */
function menu() {
    console.log("Admin Control Panel: ");
    inquirer
        .prompt([{
            type: 'rawlist',
            name: 'choice',
            message: 'What would you like to do?',
            choices: ['Create New Interview', 'Add New Question', 'Delete Question', 'Delete Session', 'View All Sessions', 'Exit']
        }])
        .then(answers => {
            console.clear();
            var answer = answers.choice;
            if (answer === 'Create New Interview')
                createInterview();
            else if (answer === 'Add New Question')
                menu();
            else if (answer === 'Delete Question')
                deleteQuestion();
            else if (answer === 'Delete Session')
                deleteQuestion();
            else if (answer === 'View All Sessions')
                viewSessions();
            else if (answer === 'Exit') {
                console.log("Goodbye!");
                process.exit();
            }
        })
        .catch(error => {
            console.log(error);
        });
}

/**
 * Prompt the user to create a new interview session
 */
function createInterview() {
    inquirer
        .prompt([{
                type: 'input',
                name: 'name',
                message: 'What is the name of the person this interview is for?: ',
            },
            {
                type: 'input',
                name: 'email',
                message: 'Who do you want to email this interview to?: '
            },
            {
                type: 'number',
                name: 'hours',
                message: 'How many hours do you want this session to last?: '
            },
            {
                type: 'number',
                name: 'minutes',
                message: 'How many minutes do you want this session to last?: '
            }
        ])
        .then(answers => {
            DATABASE.collection('questions').get().then((data2) => { // Get the maximum possible score
                var maxPoints = 0;
                data2.docs.forEach(doc => {
                    let docdata2 = doc.data();
                    maxPoints += docdata2.testOutput.length;
                    maxPoints += docdata2.hiddenOutput.length;
                });
                DATABASE.collection('sessions').add({
                    name: answers.name,
                    email: answers.email,
                    hoursGiven: answers.hours,
                    minutesGiven: answers.minutes,
                    currentQuestion: 0,
                    startTime: null,
                    endTime: null,
                    submitTime: null,
                    results: [],
                    finalScore: 0,
                    maxScore: maxPoints
                })
                .then(docRef => {
                    console.clear();
                    emailInterview(docRef);
                })
            })
        })
        .catch(error => {
            console.log(error);
        });
}

/**
 * Prompt the user to add a new question
 */
function addQuestion() {
    console.clear();
    console.log("This is currently under development!\n");
    menu();
}

/**
 * Prompt the user to delete a session from the database
 */
function deleteSession() {
    console.clear();
    console.log("This is currently under development!\n");
    menu();
}

/**
 * Prompt the user to delete a question from the database
 */
function deleteQuestion() {
    console.clear();
    console.log("This is currently under development!\n");
    menu();
}

/**
 * Displays all the sessions stored in the database
 */
function viewSessions() {
    DATABASE.collection('sessions').get().then(data => {
        console.clear();
        console.log("Current Sessions: \n");
        data.docs.forEach(doc => {
            let docdata = doc.data();
            console.log(`Session ID: ${doc.id}\nName: ${docdata.name}\nEmail: ${docdata.email}\nStarted: ${docdata.startTime != null}\nSubmitted: ${docdata.submitTime != null}\nScore: ${docdata.finalScore}/${docdata.maxScore}\n`);
        })
        menu();
    })
}

/**
 * Emails the interviee information and their code
 * @param {*} docRef 
 */
function emailInterview(docRef) {
    docRef.get().then(dataref => {
        let data = dataref.data();
        let mailOptions = {
            from: 'clicodeinterview@gmail.com',
            to: data.email,
            subject: 'Your CLI Coding Interview is Ready!',
            text: `Get hype ${data.name}! It's time to take your coding interview!\n\nYou have been given ${data.hoursGiven} hours and ${data.minutesGiven} minutes to complete the task.\n\nYou will be given a variety of questions of varying difficulties. Try your best to complete all of them in the given time!\n\nYour interview code is: ${docRef.id}\nBe sure not to lose this code or share it with anyone else!\n\nWhenever you're ready, head over to https://github.com/whyroland/interview-cli and follow the installation instructions and use the application to do your interview.\n\nGood luck!\n-CLI Code Interview Team`
        };
        console.log("Sending email to applicant...\n");
        transporter.sendMail(mailOptions, function (err, dat) {
            if (err) {
                console.log('An email error occured... Please make a new session and be sure to check the email address\n');
            } else {
                console.log(`An invite has successfully been sent to the applicant at: ${data.email}\n`);
            }
            console.log(`Your unique code for this interview is: ${docRef.id}\nGive this to the interviewee (DO NOT LOSE IT)\n`);
            menu();
        })
    })
}
