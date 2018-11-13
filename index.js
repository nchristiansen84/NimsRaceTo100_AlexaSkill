'use strict';

const Alexa = require('alexa-sdk');
const APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

const NIM_GOAL = 100;
const NIM_START = 0;
const NIM_INTERVAL_MAX = 10;
const NIM_INTERVAL_MIN = 1;

const GAME_STATES = {
    RACE: '_RACEMODE',   // Racing to NIM_GOAL
    START: '_STARTMODE'  // Entry point, start the game.
};

// Strings
const GAME_NAME = 'Nim\'s Race';
const HELP_MESSAGE = 'You and I will start from ' + NIM_START + ' and alternatively add a number from ' + NIM_INTERVAL_MIN + ' to ' + NIM_INTERVAL_MAX + ' to the sum. The player who reaches ' + NIM_GOAL + ' wins! To start a new game, say: start game. To get the current sum, say: repeat. To change the difficulty, say: easy, medium, or hard';
const HELP_REPROMPT = 'To add a number to the sum, respond with a number from ' + NIM_INTERVAL_MIN + ' to ' + NIM_INTERVAL_MAX + '.';
const STOP_MESSAGE = 'Would you like to quit playing?';
const CANCEL_MESSAGE = 'Ok, thanks for playing!';
const INVALID_NUMBER = 'Try saying a number from ' + NIM_INTERVAL_MIN + ' to ' + NIM_INTERVAL_MAX + '. Example: add five.';
const INVALID_DIFFICULTY = 'Try saying a difficlty such as easy, medium, or hard.';
const HELP_UNHANDLED = 'Say yes to continue, or no to end the game.';
const START_UNHANDLED = 'Say start game to start a new game.';
const NEW_GAME_MESSAGE = 'Welcome to ' + GAME_NAME + '. You and I will start from ' + NIM_START + ' and alternatively add a number from ' + NIM_INTERVAL_MIN + ' to ' + NIM_INTERVAL_MAX + ' to the sum. The player who reaches ' + NIM_GOAL + ' wins!';
const START_NUMBER_MESSAGE = 'I added %s making the sum %s now. What would you like to add next?';
const NEXT_NUMBER_MESSAGE = 'You said %s which changed the sum to %s. I added %s making the sum %s now. What would you like to add next?';
const DIFFICULTY_CHANGE_MESSAGE = 'Difficulty was changed to ';
const GAME_OVER_ALEXA_WIN = 'I reached ' + NIM_GOAL + '. I won! Thanks for playing.';
const GAME_OVER_PLAYER_WIN = 'You reached ' + NIM_GOAL + '. You won! Thanks for playing.';

const newSessionHandlers = {
    'LaunchRequest': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', true);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', true);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', true);
    },
    'Unhandled': function () {
        this.response.speak(START_UNHANDLED).listen(START_UNHANDLED);
        this.emit(':responseReady');
    },
};

function getHardNumber(curSum){
    var num = NIM_GOAL;
    while(num - curSum > NIM_INTERVAL_MAX){
        num -= NIM_INTERVAL_MAX+1;
    }
    return num - curSum;
}

function getMediumNumber(curSum){
    var num = getHardNumber(curSum);
    var chance = 0;
    
    if(num < 5){
        chance += Math.floor(Math.random() * 2);
    }else{
        chance -= Math.floor(Math.random() * 3);
    }

    num+= chance;
    return num;
}

function isDifficultySlotValid(intent) {
    const difficultySlotFilled = intent && intent.slots && intent.slots.difficulty && intent.slots.difficulty.value;
    return difficultySlotFilled
        && (intent.slots.difficulty.value === 'easy'
        || intent.slots.difficulty.value === 'medium'
        || intent.slots.difficulty.value === 'hard');
}

function isNumberSlotValid(intent) {
    const numberSlotFilled = intent && intent.slots && intent.slots.number && intent.slots.number.value;
    const numberSlotIsInt = numberSlotFilled && !isNaN(parseInt(intent.slots.number.value, 10));
    return numberSlotIsInt
        && parseInt(intent.slots.number.value, 10) < (NIM_INTERVAL_MAX + 1)
        && parseInt(intent.slots.number.value, 10) > (NIM_INTERVAL_MIN - 1);
}

function handleDifficultyChange(unused) {
    const difficultySlotValid = isDifficultySlotValid(this.event.request.intent);
    let speechOutput = this.attributes.speechOutput;
    let repromptText = this.attributes.repromptText;
    let currentSum = parseInt(this.attributes.currentSum, 10);
    var difficulty = this.attributes.difficulty;
    
    if(difficultySlotValid){
        difficulty = this.event.request.intent.slots.difficulty.value;
        speechOutput = DIFFICULTY_CHANGE_MESSAGE + difficulty + '.';
    }else{
        this.response.speak(INVALID_DIFFICULTY).listen(INVALID_DIFFICULTY);
        this.emit(':responseReady');
    }
    
    Object.assign(this.attributes, {
        'speechOutput': repromptText,
        'repromptText': repromptText,
        'currentSum': currentSum,
        'difficulty': difficulty
    });
    
    this.response.speak(speechOutput).listen(speechOutput);
    this.response.cardRenderer(GAME_NAME, speechOutput);
    this.emit(':responseReady');
}

function handleNextNumber(unused) {
    const numberSlotValid = isNumberSlotValid(this.event.request.intent);
    let speechOutput = '';
    let currentSum = parseInt(this.attributes.currentSum, 10);
    let difficulty = this.attributes.difficulty;
    var iAddToSum = Math.ceil(Math.random() * NIM_INTERVAL_MAX);
    var uAddToSum = 0;

    if(numberSlotValid){
        uAddToSum = parseInt(this.event.request.intent.slots.number.value, 10);
    }else{
        this.response.speak(INVALID_NUMBER).listen(INVALID_NUMBER);
        this.emit(':responseReady');
    }
    
    currentSum += uAddToSum;
    
    if(difficulty === 'medium'){
        iAddToSum = getMediumNumber(currentSum);
    }else if(difficulty === 'hard'){
        iAddToSum = getHardNumber(currentSum);
    }

    var newSum = currentSum + iAddToSum;
    if(currentSum >= NIM_GOAL){
        // Player won
        this.response.speak(GAME_OVER_PLAYER_WIN);
        this.emit(':responseReady');
    }else{
        // Player didn't win
        if(newSum >= NIM_GOAL){
            // Alexa won
            speechOutput = NEXT_NUMBER_MESSAGE.replace('%s', uAddToSum);
            speechOutput = speechOutput.replace('%s', currentSum);
            speechOutput = speechOutput.replace('%s', iAddToSum);
            speechOutput = speechOutput.replace('%s', newSum);
            speechOutput += ' ' + GAME_OVER_ALEXA_WIN;
            this.response.speak(speechOutput);
            this.emit(':responseReady');
        }else{
            // Alexa didn't win
            speechOutput = NEXT_NUMBER_MESSAGE.replace('%s', uAddToSum);
            speechOutput = speechOutput.replace('%s', currentSum);
            speechOutput = speechOutput.replace('%s', iAddToSum);
            speechOutput = speechOutput.replace('%s', newSum);
        }
    }

    Object.assign(this.attributes, {
        'speechOutput': speechOutput,
        'repromptText': speechOutput,
        'currentSum': newSum,
        'difficulty': difficulty
    });

    this.response.speak(speechOutput).listen(speechOutput);
    this.response.cardRenderer(GAME_NAME, speechOutput);
    this.emit(':responseReady');
}

const startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
    'StartGame': function (newGame) {
        let speechOutput = '';
        if(newGame){
            speechOutput = NEW_GAME_MESSAGE;
        }

        const difficulty = 'medium';
        const addToSum = getMediumNumber(NIM_START);
        const newSum = addToSum;
        
        let repromptText = START_NUMBER_MESSAGE.replace('%s', addToSum);
        repromptText = repromptText.replace('%s', newSum);

        speechOutput += ' ' + repromptText;

        Object.assign(this.attributes, {
            'speechOutput': repromptText,
            'repromptText': repromptText,
            'currentSum': newSum,
            'difficulty': difficulty
        });

        this.handler.state = GAME_STATES.RACE;

        this.response.speak(speechOutput).listen(repromptText);
        this.response.cardRenderer(GAME_NAME, repromptText);
        this.emit(':responseReady');
    },
});

const gameStateHandlers = Alexa.CreateStateHandler(GAME_STATES.RACE, {
    'NumberGuessIntent': function () {
        handleNextNumber.call(this, false);
    },
    'ChangeDifficultyIntent': function () {
        handleDifficultyChange.call(this, false);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.response.speak(this.attributes['speechOutput']).listen(this.attributes['repromptText']);
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent': function () {
        this.response.speak(HELP_MESSAGE).listen(HELP_REPROMPT);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE).listen(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.YesIntent': function () {
        this.response.speak(CANCEL_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.NoIntent': function () {
        this.handler.state = GAME_STATES.RACE;
        this.response.speak(this.attributes['speechOutput']).listen('repromptText');
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(CANCEL_MESSAGE);
        this.emit(':responseReady');
    },
    'Unhandled': function () {
        this.response.speak(INVALID_NUMBER).listen(INVALID_NUMBER);
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended in race state: ${this.event.request.reason}`);
    },
});

exports.handler = function (event, context) {
    const alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, gameStateHandlers);
    alexa.execute();
};
