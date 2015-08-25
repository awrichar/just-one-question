var CONTEXTIO_KEY = 'auscnwj4';
var CONTEXTIO_SECRET = 'l6iPLC55PdyiYxwI';
var EMAIL_USER = 'just.one.question.app@gmail.com';
var EMAIL_PASSWORD = 'bD0SzshyNBpV5Zt';

var express = require('express');
var sqlite3 = require('sqlite3');
var contextio = require('contextio');
var nodemailer = require('nodemailer');
var questionModel = require('../models/question');
var responseModel = require('../models/response');

var app = express();
app.set('views', './app/views');
app.use(express.bodyParser());

var db = new sqlite3.Database('./db.sqlite3');

function splitChoices(choices) {
  var output = [];
  choices = choices.split('\n');

  for (var i=0; i<choices.length; i++) {
    output.push(choices[i].trim());
  }

  return output;
}

function numberChoices(choices) {
  var output = [];

  for (var i=0; i<choices.length; i++) {
    output.push((i+1) + ') ' + choices[i]);
  }

  return output;
}

function getQuestionParams(body) {
  var choices = body.choices,
    choicesSplit = splitChoices(choices),
    choicesNumbered = numberChoices(choicesSplit);

  return {
    email: body.email,
    recipients: body.recipients,
    question: body.question,
    choices: choices,
    choicesSplit: choicesSplit,
    choicesNumbered: choicesNumbered
  };
}

function logError(msg, err) {
  if (err) console.log(msg + '\n' + err);
  else console.log(msg);
}

function errorResponse(response, msg, err) {
  logError(msg, err);
  return response.render('error.ejs');
}

function getContextIOAccount(client, email, callback) {
  client.accounts().get({email: email}, function(err, response) {
    if (err || !response.body.length) return callback(err);
    callback(null, response.body[0]['id']);
  });
}

function createQuestion(owner, recipients, q, choices, callback) {
  questionModel.create(owner, recipients, q, function(err, id) {
      if (err) return callback(err);

      responseModel.createMany(id, choices, function(err) {
        if (err) return callback(err);
        callback(null, id);
      });
    }
  );
}

function sendEmail(from, recipients, subject, body, callback) {
  var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    }
  });

  var mailOptions = {
    from: from + '<' + EMAIL_USER + '>',
    replyTo: EMAIL_USER,
    to: recipients,
    subject: subject,
    text: body
  };

  transporter.sendMail(mailOptions, function(err, info) {
    if (err) return callback(err);
    callback(null);
  });
}

function createHook(request, id, callback) {
  var prefix = '[Q' + id + ']';
  var client = new contextio.Client({
    key: CONTEXTIO_KEY,
    secret: CONTEXTIO_SECRET
  });

  getContextIOAccount(client, EMAIL_USER, function(err, ctxID) {
    if (err) return callback(err);

    var urlPrefix = request.protocol + '://' + request.get('host') + '/poll',
      hookOptions = {
        filter_to: EMAIL_USER,
        filter_subject: prefix,
        callback_url: urlPrefix + '/response/' + id,
        failure_notif_url: urlPrefix + '/failure/' + id
      };

    client.accounts(ctxID).webhooks().post(hookOptions, function(err) {
      if (err) return callback(err);
      callback(null);
    });
  });
}

app.post('/', function (request, response) {
  response.render('preview.ejs', getQuestionParams(request.body));
});

app.post('/send', function (request, response) {
  var params = getQuestionParams(request.body);

  createQuestion(params.email, params.recipients, params.question, params.choicesSplit, function(err, id) {
    if (err) return errorResponse(response, 'Error inserting into database', err);

    var prefix = '[Q' + id + ']',
      subject = prefix + ' ' + params.question,
      body = 'You\'ve been asked a question by ' + params.email + ':\n' + params.question + '\n\n' +
        params.choicesNumbered.join('\n') +
        '\n\nPlease respond to this email with a single number indicating your choice.';

    sendEmail(params.email, params.recipients, subject, body, function(err) {
      if (err) return errorResponse(response, 'Error sending email', err);

      createHook(request, id, function(err) {
        if (err) return errorResponse(response, 'Error creating email hook', err);
        response.render('success.ejs');
      });
    });
  });
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
    if (err) return logError('Error connecting to Context.IO', err);

    client.accounts(ctxID).messages(messageID).body().get({type: 'text/plain'}, function(err, msg) {
      if (err || !msg.body.length) logError('Error getting message body', err);

      var body = msg.body[0]['content'],
        result = body.match(/^\s*(\d+)/),
        choice = result ? parseInt(result[1]) : null;

      if (!choice || isNaN(choice) || choice < 1)
        return logError('Error parsing response');

      db.get('SELECT COUNT(*) FROM response WHERE question_id = ?', pollID, function(err, row) {
        if (err) return logError('Error finding question', err);

        var count = row['COUNT(*)'];
        if (choice > count) return logError('Choice is out of range');

        db.run('UPDATE response SET count=count+1 WHERE question_id=? AND idx=?',
          [pollID, choice],
          function (err) {
            if (err || !this.changes) return logError('Error writing response', err);
            console.log('Added response (' + choice + ') to question (' + pollID + ')');
          }
        );
      });
    });
  });
});

module.exports = app