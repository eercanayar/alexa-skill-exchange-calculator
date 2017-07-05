'use strict';

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Alexa Exchange Calculator. ';
   
    const repromptText = 'Please tell me the currency which will be exchanged like, exchange 1000 dollars.';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using exchange calculator. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
 
function calculateExchangeProcess(intent, session, callback) {
    const cardTitle = intent.name;
    const amountSlot = intent.slots.Amount;
    const currencySlot = intent.slots.Currency;
    let repromptText = '';
    const shouldEndSession = false;
    let speechOutput = '';

    if (amountSlot && currencySlot) {
        const amountVal = amountSlot.value;
        const currencyVal = currencySlot.value;
        
        var http = require('http');

        var currencyDict = {};
        
		// currency rates api
		// ref: http://fixer.io
        var options = {
          host: 'api.fixer.io',
          path: '/latest?base=TRY'
        };
        
        var callbackQ = function(response) {
          var strResult = '';
        
          response.on('data', function (chunk) {
        	strResult += chunk;
          });
        
          response.on('end', function () {
        	try {
        		var ratesData = JSON.parse(strResult);
        	} catch(e) {
                throw new Error('Parse error:' + e);
            }
        	console.log(ratesData);
        	currencyDict['euros'] = ratesData.rates.EUR;
        	currencyDict['dollars'] = ratesData.rates.USD;
        	speechOutput += "It equals to "+Math.round(amountVal/currencyDict[currencyVal])+" Turkish Liras.";
        	callback({}, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
          });
        };
        
        http.request(options, callbackQ).end();

        speechOutput = `You asked ${amountVal} ${currencyVal}. `;
            
        repromptText = "You can ask me another currency exchange if you want.";
    } else {
        speechOutput = "I'm not sure which currency you want to exchange. Please try again.";
        repromptText = "I'm not sure which currency you want to exchange. Plase tell me the currency which will be exchanged like, exchange 1000 dollars.";
        
        callback({}, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }

    
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'calculateExchange') {
        calculateExchangeProcess(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
