var express = require('express');
var bodyParser = require('body-parser');
var contextio = require('contextio');
var config = require('../config');
var email = require('../helpers/email');
var questionModel = require('../models/question');
var responseModel = require('../models/response');
var questionForm = require('../forms/question');
var userModel = require('../models/user');
var error = require('../helpers/error');

var router = express.Router();
module.exports = router;

router.use(bodyParser.urlencoded({ extended: false }));

var bootstrapField = function (name, object) {
  if (!Array.isArray(object.widget.classes)) { object.widget.classes = []; }
  if (object.widget.classes.indexOf('form-control') === -1) {
      object.widget.classes.push('form-control');
  }

  var label = object.labelHTML(name);
  var error = object.error ? '<div class="help-block has-error">' + object.error + '</div>' : '';

  var validationclass = object.value && !object.error ? 'has-success' : '';
  validationclass = object.error ? 'has-error' : validationclass;

  var widget = object.widget.toHTML(name, object);
  return '<div class="form-group ' + validationclass + '">' + widget + error + '</div>';
};

router.get('/', function(request, response) {
  renderEditForm(questionForm(), response);
});

router.post('/', function (request, response) {
  if (request.body.action == 'Edit') {
    var form = questionForm().bind(request.body);
    renderEditForm(form, response);
  } else if (request.body.preview) {
    checkPreviewForm(request, response);
  } else {
    questionForm().handle(request, {
      success: function(form) {
        console.log("Success");
        checkPreviewForm(request, response, true);
      },
      error: function(form) {
        console.log("Error");
        renderEditForm(form, response);
      },
      empty: function(form) {
        console.log("Empty");
      }
    });
  }
});

router.post('/response/:id', function (request, response) {
  response.send();

  var pollID = request.params.id,
    messageID = request.body.message_data.message_id;

  var client = new contextio.Client({
    key: config.CONTEXTIO_KEY,
    secret: config.CONTEXTIO_SECRET
  });

  getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
    if (err) return error.log('Error connecting to Context.IO', err);

    client.accounts(ctxID).messages(messageID).body().get({type: 'text/plain'}, function(err, msg) {
      if (err || !msg.body.length) error.log('Error getting message body', err);

      var body = msg.body[0]['content'],
        result = body.match(/^\s*(\d+)/),
        choice = result ? parseInt(result[1]) : null;

      if (!choice || isNaN(choice) || choice < 1)
        return error.log('Error parsing response');

      responseModel.getCount(pollID, function(err, count) {
        if (err) return error.log('Error finding question', err);
        if (choice > count) return error.log('Choice is out of range');

        responseModel.increment(pollID, choice, function(err, changes) {
          if (err || !changes) return error.log('Error writing response', err);
          console.log('Added response (' + choice + ') to question (' + pollID + ')');
        });
      });
    });
  });
});

function getPrefix(id) {
  return '[Q' + id + ']';
}

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

function createHook(request, id, callback) {
  var prefix = getPrefix(id);
  var client = new contextio.Client({
    key: config.CONTEXTIO_KEY,
    secret: config.CONTEXTIO_SECRET
  });

  getContextIOAccount(client, config.EMAIL_USER, function(err, ctxID) {
    if (err) return callback(err);

    var urlPrefix = request.protocol + '://' + request.get('host') + '/main',
      hookOptions = {
        filter_to: config.EMAIL_USER,
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

function renderEditForm(form, response) {
  response.render('index.ejs', {form: form.toHTML(bootstrapField)});
}

function renderPreviewForm(request, response, step) {
  var params = getQuestionParams(request.body);
  params['step'] = step;
  response.render('preview.ejs', params);
}

function createUser(username, password, callback) {
  userModel.create(username, password, function(err, user) {
    if (err) return callback(err);
    sendConfirmation(username, user.confirmation_code, function(err) {
      if (err) return callback(err);
      callback(null);
    });
  });
}

function sendConfirmation(to, code, callback) {
  var body = 'Thanks for signing up with Just One Question. Please confirm your account using the code ' + code + '.';
  email.send('Just One Question', [to], 'Confirm your account', body, function(err) {
    if (err) return callback(err);
    callback(null);
  });
}

function checkPreviewForm(request, response, forceShow) {
  var email = request.body.email;

  if (request.body.password) {
    createUser(email, request.body.password, function(err) {
      if (err) return error.response(response, 'Error creating user', err);
      renderPreviewForm(request, response, 'confirm');
    });
  } else if (request.body.code) {
    userModel.confirm(email, request.body.code, function(err, success) {
      if (err) error.response(response, 'Error confirming user', err);
      else if (!success) renderPreviewForm(request, response, 'confirm');
      else sendQuestion(request, response);
    });
  } else {
    userModel.get(email, function(err, user) {
      if (err) return error.response(response, 'Error looking up user', err);

      if (!user) renderPreviewForm(request, response, 'register');
      else if (user.confirmation_code) renderPreviewForm(request, response, 'confirm');
      else if (forceShow) renderPreviewForm(request, response);
      else sendQuestion(request, response);
    });
  }
}

function sendQuestion(request, response) {
  var params = getQuestionParams(request.body);

  createQuestion(params.email, params.recipients, params.question, params.choicesSplit, function(err, id) {
    if (err) return error.response(response, 'Error inserting into database', err);

    var prefix = getPrefix(id),
      subject = prefix + ' ' + params.question,
      body = 'You\'ve been asked a question by ' + params.email + ':\n' + params.question + '\n\n' +
        params.choicesNumbered.join('\n') +
        '\n\nPlease respond to this email with a single number indicating your choice.';

    email.send(params.email, params.recipients, subject, body, function(err) {
      if (err) return error.response(response, 'Error sending email', err);

      createHook(request, id, function(err) {
        if (err) return error.response(response, 'Error creating email hook', err);
        response.render('success.ejs');
      });
    });
  });
}