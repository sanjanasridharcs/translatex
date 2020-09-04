//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework

var framework = require('webex-node-bot-framework');
var webhook = require('webex-node-bot-framework/webhook');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(express.static('images'));
const config = require("./config.json");
const apiKey = "";
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

/* On mention with command, using other trigger data, can use lite markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
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
  //console.log(bot.room.id);
  //the "trigger" parameter gives you access to data about the user who entered the command
  let outputString = `Language changed to ${language[trigger.person.id]}!`;
  bot.reply(trigger.message, outputString);
});

/* On mention with bot data 
ex User enters @botname 'space' phrase, the bot will provide details about that particular space
*/
framework.hears('language list', function (bot) {
  console.log("language list");
  responded = true;

  outputString = "Here is a link detailing the two-letter codes for languages. Please use ISO 639-1. \n";
  outputString += "http://www.loc.gov/standards/iso639-2/php/code_list.php";
  console.log(outputString);
  bot.say("markdown", outputString)
    .catch((e) => console.error(`bot.say failed: ${e.message}`));

});


/* 
   Say hi to every member in the space
   This demonstrates how developers can access the webex
   sdk to call any Webex API.  API Doc: https://webex.github.io/webex-js-sdk/api/
*/
/*
framework.hears("say hi to everyone", function (bot) {
  console.log("say hi to everyone.  Its a party");
  responded = true;
  // Use the webex SDK to get the list of users in this space
  bot.webex.memberships.list({roomId: bot.room.id})
    .then((memberships) => {
      for (const member of memberships.items) {
        if (member.personId === bot.person.id) {
          // Skip myself!
          continue;
        }
        let displayName = (member.personDisplayName) ? member.personDisplayName : member.personEmail;
        bot.say(`Hello ${displayName}`);
      }
    })
    .catch((e) => {
      console.error(`Call to sdk.memberships.get() failed: ${e.messages}`);
      bot.say('Hello everybody!');
    });
}); 

// Buttons & Cards data
let cardJSON =
{
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: 'AdaptiveCard',
  version: '1.0',
  body:
    [{
      type: 'ColumnSet',
      columns:
        [{
          type: 'Column',
          width: '5',
          items:
            [{
              type: 'Image',
              url: 'Your avatar appears here!',
              size: 'large',
              horizontalAlignment: "Center",
              style: 'person'
            },
            {
              type: 'TextBlock',
              text: 'Your name will be here!',
              size: 'medium',
              horizontalAlignment: "Center",
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: 'And your email goes here!',
              size: 'small',
              horizontalAlignment: "Center",
              isSubtle: true,
              wrap: false
            }]
        }]
    }]
};

*/

  /* On mention reply example
ex User enters @botname 'reply' phrase, the bot will post a threaded reply
*/
framework.hears('language', function (bot, trigger) {
  console.log("someone asked for language");
  responded = true;
  outputMessage = "Current Language is " + language[trigger.person.id];
  bot.reply(trigger.message, outputMessage, "markdown");
});

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
      if (sentiment.documentSentiment.score > 0.25) {
        sentimentResult = "\u{1F642}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
        console.log("happy");
      } else if (sentiment.documentSentiment.score < -0.25) {
        sentimentResult = "\u{1F641}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
        console.log("sad");
      } else {
        sentimentResult = "\u{1F610}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
      }
      bot.reply(trigger.message, sentimentResult, "markdown");

      console.log(sentiment.documentSentiment.score);

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
    console.log("someone asked for a translation");
    responded = true;
    var text = trigger.message.text;
    text = text.substring(21);
    console.log("1");

    nlp.analyzeSentiment( text )
      .then(function( sentiment ) {
        var sentimentResult = "";
        console.log("2");
        if (sentiment.documentSentiment.score > 0.25) {
          sentimentResult = "\u{1F642}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
          console.log("happy");
        } else if (sentiment.documentSentiment.score < -0.25) {
          sentimentResult = "\u{1F641}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
          console.log("sad");
        } else {
          sentimentResult = "\u{1F610}: " + sentiment.documentSentiment.score + " on a scale of -1.0 to 1.0";
        }

        console.log(sentiment.documentSentiment.score);
        translate.translate(text, language[bot.room.id], function(err, translation) {
          console.log(bot.room.id);
          if (translation) {
            var message = translation.translatedText + " (" + sentimentResult + ")";
            bot.reply(trigger.message, message, "markdown");
          }
        })
        .catch(function(error) {
          bot.say("Please enter a valid two-letter code for the desired language.");
          console.log(error.message);
        });
      })
      .catch(function( error ) {
        console.log( 'Error:', error.message );
      });
      responded = true;
    }
});

function sendHelp(bot) {
  bot.say("markdown", 'These are the commands I can respond to:', '\n\n ' +
    '1. **change to**   (enter the two-letter code of the language you would like to translate to) \n' +
    '2. **language list**  (get a list of two-letter codes of languages) \n' +
    '3. **language**  (get current language the bot is translating to) \n' +
    '4. **help** (what you are reading now) \n' +
    '5. anything else - will translate to the desired language');
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
