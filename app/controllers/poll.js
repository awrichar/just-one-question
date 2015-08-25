var CONTEXTIO_KEY = "auscnwj4";
var CONTEXTIO_SECRET = "l6iPLC55PdyiYxwI";
var EMAIL_USER = "just.one.question.app@gmail.com";
var EMAIL_PASSWORD = "bD0SzshyNBpV5Zt";

var express = require('express');
var sqlite3 = require('sqlite3');
var contextio = require('contextio');
var nodemailer = require('nodemailer');

var app = express();
app.set('views', './app/views');
app.use(express.bodyParser());

var db = new sqlite3.Database('./db.sqlite3');

function numberChoices(choices) {
  var output = [];

  for (var i=0; i<choices.length; i++) {
    output.push((i+1) + ") " + choices[i]);
  }

  return output;
}

function logError(msg, err) {
  if (err) console.log(msg + '\n' + err);
  else console.log(msg);
}

function errorResponse(response, msg, err) {
  logError(msg, err);
  return response.render("error.ejs");
}

function getContextIOAccount(client, email, callback) {
  client.accounts().get({email: email}, function(err, response) {
    if (err || !response.body.length) return callback(err);
    callback(null, response.body[0]['id']);
  });

}

app.post('/', function (request, response) {
  response.render("preview.ejs", {
    email: request.body.email,
    recipients: request.body.recipients,
    question: request.body.question,
    choices: request.body.choices,
    choicesSplit: numberChoices(request.body.choices.split("\n"))
  });
});

app.post('/send', function (request, response) {
  var from = request.body.email,
    recipients = request.body.recipients,
    question = request.body.question,
    choices = request.body.choices,
    choicesSplit = numberChoices(request.body.choices.split("\n"));

  db.run("INSERT INTO question (owner, recipients, question, choices) VALUES (?, ?, ?, ?)",
    [from, recipients, question, choices],
    function (err) {
      if (err) return errorResponse(response, "Error inserting into database", err);

      var id = this.lastID,
        prefix = "[Q" + id + "]",
        subject = prefix + " " + question,
        body = "You've been asked a question by " + from + ":\n" + question + "\n\n" +
          choicesSplit.join("\n") +
          "\n\nPlease respond to this email with a single number indicating your choice.";

      var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD,
        }
      });

      var mailOptions = {
        from: from + "<" + EMAIL_USER + ">",
        replyTo: EMAIL_USER,
        to: recipients,
        subject: subject,
        text: body
      };

      transporter.sendMail(mailOptions, function(err, info) {
        if (err) return errorResponse(response, "Error sending email", err);

        var client = new contextio.Client({
          key: CONTEXTIO_KEY,
          secret: CONTEXTIO_SECRET
        });

        getContextIOAccount(client, EMAIL_USER, function(err, ctxID) {
          if (err) return errorResponse(response, "Error connecting to Context.IO", err);

          var urlPrefix = request.protocol + '://' + request.get('host') + '/poll',
            hookOptions = {
              filter_to: EMAIL_USER,
              filter_subject: prefix,
              callback_url: urlPrefix + '/response/' + id,
              failure_notif_url: urlPrefix + '/failure/' + id
            };

          client.accounts(ctxID).webhooks().post(hookOptions, function(err) {
            if (err) return errorResponse(response, "Error creating web hook", err);
            return response.render("success.ejs");
          });
        });
      });
    }
  );
});

app.post('/response/:id', function (request, response) {
  response.send();

  var pollID = request.params.id,
    messageID = request.body.message_data.message_id;

  var client = new contextio.Client({
    key: CONTEXTIO_KEY,
    secret: CONTEXTIO_SECRET
  });

  getContextIOAccount(client, EMAIL_USER, function(err, ctxID) {
    if (err) return logError("Error connecting to Context.IO", err);

    client.accounts(ctxID).messages(messageID).body().get({type: 'text/plain'}, function(err, msg) {
      if (err || !msg.body.length) logError("Error getting message body", err);

      var body = msg.body[0]['content'],
        result = body.match(/^\s*(\d+)/),
        choice = result ? parseInt(result[1]) : null;

      if (!choice || isNaN(choice) || choice < 1)
        return logError("Error parsing response");

      db.get("SELECT choices FROM question WHERE ROWID = ?", pollID, function(err, row) {
        if (err) return logError("Error finding question", err);

        var choices = row.choices.split("\n"),
          numChoices = choices.length;

        if (choice > numChoices) return logError("Choice is out of range");

        db.run("INSERT INTO response (question_id, choice) VALUES (?, ?)",
          [pollID, choice],
          function (err) {
            if (err) return logError("Error writing response", err);
            console.log("Added response (" + choice + ") to question (" + pollID + ")");
          }
        );
      });
    });
  });
});

module.exports = app