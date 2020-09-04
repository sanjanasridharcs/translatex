//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework

var framework = require('webex-node-bot-framework');
var webhook = require('webex-node-bot-framework/webhook');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(express.static('images'));
const config = require("./config.json");
const apiKey = ""; // enter API key for Google Cloud here
var translate = require('google-translate')(apiKey);
var NLP = require('google-nlp');
var nlp = new NLP(apiKey);
var language = {};

// init framework
var framework = new framework(config);
framework.start();
console.log("Starting framework, please wait...");

framework.on("initialized", function () {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// If actorId is set, it means that user has just added your bot to a new space
// If not, the framework has discovered your bot in an existing space
framework.on('spawn', (bot, id, actorId) => {
  if (!actorId) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    console.log(`While starting up, the framework found our bot in a space called: ${bot.room.title}`);
  } else {
    // When actorId is present it means someone added your bot got added to a new space
    // Lets find out more about them..
    var msg = 'You can say `help` to get the list of words I am able to respond to.';
    bot.webex.people.get(actorId).then((user) => {
      msg = `Hello there ${user.displayName}. ${msg}`; 
    }).catch((e) => {
      console.error(`Failed to lookup user details in framwork.on("spawn"): ${e.message}`);
      msg = `Hello there. ${msg}`;  
    }).finally(() => {
      // Say hello, and tell users what you do!
      if (bot.isDirect) {
        bot.say('markdown', msg);
      } else {
        let botName = bot.person.displayName;
        msg += `\n\nDon't forget, in order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
        bot.say('markdown', msg);
      }
    });
  }

  
});

//Process incoming messages

let responded = false;
/* On mention with command
ex User enters @botname help, the bot will write back in markdown
*/
framework.hears(/help|what can i (do|say)|what (can|do) you do/i, function (bot, trigger) {
  console.log(`someone needs help! They asked ${trigger.text}`);
  responded = true;
  bot.say(`Hello ${trigger.person.displayName}.`)
    .then(() => sendHelp(bot))
    .catch((e) => console.error(`Problem in help hander: ${e.message}`));
});

/* 
Allows the user to enter a two-letter language code to change the 
language they would like translations in
*/
framework.hears('change to', function (bot, trigger) {
  console.log("changeTo command received");
  responded = true;
  var text = trigger.message.text;
  if (text.substring(0, 10) === "TranslateX") {
    text = text.substring(21);
  } else {
    text = text.substring(10);
  }
  language[trigger.person.id] = text;
  //the "trigger" parameter gives you access to data about the user who entered the command
  let outputString = `Language changed to ${language[trigger.person.id]}!`;
  bot.reply(trigger.message, outputString);
});

/* 
Allows user to easily access a link detailed two-letter codes for languages 
*/
framework.hears('codes', function (bot) {
  console.log("codes");
  responded = true;

  outputString = "Here is a link detailing the two-letter codes for languages. Please use ISO 639-1. \n";
  outputString += "http://www.loc.gov/standards/iso639-2/php/code_list.php";
  console.log(outputString);
  bot.say("markdown", outputString)
    .catch((e) => console.error(`bot.say failed: ${e.message}`));

});

  /* On mention reply example
Allows user to see what their current language is set to
*/
framework.hears('language', function (bot, trigger) {
  console.log("someone asked for language");
  responded = true;
  outputMessage = "Current Language is " + language[trigger.person.id];
  bot.reply(trigger.message, outputMessage, "markdown");
});

/*
Translates the user's message into their desired language and
provides the sentiment analysis of the phrase prior to translation
*/
framework.hears('translate', function (bot, trigger) {
  console.log("someone asked for a translation");
  responded = true;

  var text = trigger.message.text;
  text = text.substring(21);
  console.log("1");

  if (!language[trigger.person.id]) {
    language[trigger.person.id] = 'es';
  }

  nlp.analyzeSentiment( text )
    .then(function( sentiment ) {
      var sentimentResult = "";
      console.log("2");
      var phrase = " on a scale of -1.0 to 1.0";
      
      if (sentiment.documentSentiment.score > 0.25) {
        sentimentResult = "\u{1F642}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
        console.log("happy");
      } else if (sentiment.documentSentiment.score < -0.25) {
        sentimentResult = "\u{1F641}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
        console.log("sad");
      } else {
        sentimentResult = "\u{1F610}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
      }
      translate.translate(phrase, language[trigger.person.id], function(err, translation) {
        if (translation) {
          var message = sentimentResult + translation.translatedText;
          bot.reply(trigger.message, sentimentResult, "markdown");
        }
      });

      translate.translate(text, language[trigger.person.id], function(err, translation) {
        console.log(trigger.person.id);
        if (translation) {
          var message = translation.translatedText;
          bot.reply(trigger.message, message, "markdown");
        }
      });
    })
    .catch(function( error ) {
      console.log( 'Error:', error.message );
    });

    
});



/* On mention with unexpected bot command
   Its a good practice is to gracefully handle unexpected input
*/
framework.hears(/.*/, function (bot, trigger) {
  // This will fire for any input so only respond if we haven't already
  if (!responded) {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot.say(`Sorry, I don't know how to respond to "${trigger.text}"`)
      .then(() => sendHelp(bot))
      .catch((e) => console.error(`Problem in the unexepected command hander: ${e.message}`));
  }
  responded = false;
});

function sendHelp(bot) {
  bot.say("markdown", 'These are the commands I can respond to:', '\n\n ' +
    '1. **translate <message>**  (translate message to desired language) \n' +
    '2. **change to <2 letter language code)**   (enter the two-letter code of the language you would like to translate to) \n' +
    '3. **codes**  (get a list of two-letter codes of languages) \n' +
    '4. **language**  (get current language the bot is translating to) \n' +
    '5. **help** (what you are reading now)');
}


//Server config & housekeeping
// Health Check
app.get('/', function (req, res) {
  res.send(`I'm alive.`);
});

app.post('/', webhook(framework));

var server = app.listen(config.port, function () {
  framework.debug('framework listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function () {
  framework.debug('stoppping...');
  server.close();
  framework.stop().then(function () {
    process.exit();
  });
});
