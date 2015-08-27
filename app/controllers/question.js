var express = require('express');
var bodyParser = require('body-parser');
var email = require('../helpers/email');
var questionModel = require('../models/question');
var responseModel = require('../models/response');
var questionForm = require('../forms/question');
var userModel = require('../models/user');
var error = require('../helpers/error');
var auth = require('../helpers/auth');
var webhook = require('../helpers/webhook');

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
  var hideEmail = request.user ? true : false;
  renderEditForm(questionForm({hideEmail: hideEmail}), response);
});

router.post('/', function (request, response) {
  var hideEmail = request.user ? true : false;

  if (request.body.action == 'Edit') {
    var form = questionForm({hideEmail: hideEmail}).bind(request.body);
    renderEditForm(form, response);
  } else if (request.body.preview) {
    checkPreviewForm(request, response);
  } else {
    questionForm({hideEmail: hideEmail}).handle(request, {
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

function getQuestionParams(request) {
  var body = request.body,
    choices = body.choices,
    choicesSplit = splitChoices(choices),
    choicesNumbered = numberChoices(choicesSplit);

  return {
    email: body.email || request.user.username,
    recipients: body.recipients,
    question: body.question,
    choices: choices,
    choicesSplit: choicesSplit,
    choicesNumbered: choicesNumbered
  };
}

function createQuestion(user_id, recipients, q, choices, callback) {
  questionModel.create(user_id, recipients, q, function(err, id) {
      if (err) return callback(err);

      responseModel.createMany(id, choices, function(err) {
        if (err) return callback(err);
        callback(null, id);
      });
    }
  );
}

function renderEditForm(form, response) {
  response.render('index.ejs', {form: form.toHTML(bootstrapField)});
}

function renderPreviewForm(request, response, step) {
  var params = getQuestionParams(request);
  params['step'] = step;
  response.render('preview.ejs', params);
}

function createUser(username, password, callback) {
  userModel.create(username, password, function(err, user) {
    if (err) return callback(err);
    sendConfirmation(username, user.confirmation_code, function(err) {
      if (err) return callback(err);
      callback(null, user);
    });
  });
}

function sendConfirmation(to, code, callback) {
  var body = 'Thanks for signing up with Just One Question. Please confirm your account using the code ' + code + '.';
  email.send('Just One Question', [to], [], 'Confirm your account', body, function(err) {
    if (err) return callback(err);
    callback(null);
  });
}

function checkPreviewForm(request, response, forceShow) {
  var email = request.body.email || request.user.username;
  var step = request.body.step;

  if (step == 'register') {
    createUser(email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error creating user', err);
      auth.setUser(request, response, user, function(err) {
        if (err) return error.response(response, 'Error logging in', err);
        renderPreviewForm(request, response, 'confirm');
      });
    });
  } else if (step == 'confirm') {
    userModel.confirm(email, request.body.code, function(err, success) {
      if (err) return error.response(response, 'Error confirming user', err);
      if (!success) return renderPreviewForm(request, response, 'confirm');
      if (!request.user) return renderPreviewForm(request, response, 'login');
      sendQuestion(request, response);
    });
  } else if (step == 'login') {
    auth.checkAndLogin(request, response, email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error logging in', err);
      if (!user) return renderPreviewForm(request, response, 'login');
      sendQuestion(request, response);
    });
  } else {
    if (request.user) {
      if (request.user.confirmation_code) return renderPreviewForm(request, response, 'confirm');
      if (forceShow) return renderPreviewForm(request, response);
      sendQuestion(request, response);
    } else {
      userModel.get(email, function(err, user) {
        if (err) return error.response(response, 'Error looking up user', err);
        if (!user) return renderPreviewForm(request, response, 'register');
        if (user.confirmation_code) return renderPreviewForm(request, response, 'confirm');
        renderPreviewForm(request, response, 'login');
      });
    }
  }
}

function sendQuestion(request, response) {
  var params = getQuestionParams(request);

  createQuestion(request.user.id, params.recipients, params.question, params.choicesSplit, function(err, id) {
    if (err) return error.response(response, 'Error inserting into database', err);

    var prefix = webhook.getPrefix(id),
      subject = prefix + ' ' + params.question,
      body = 'You\'ve been asked a question by ' + params.email + ':\n' + params.question + '\n\n' +
        params.choicesNumbered.join('\n') +
        '\n\nPlease respond to this email with a single number indicating your choice.';

    email.send(params.email, [], params.recipients, subject, body, function(err) {
      if (err) return error.response(response, 'Error sending email', err);

      webhook.createHook(request, id, function(err) {
        if (err) return error.response(response, 'Error creating email hook', err);
        response.render('success.ejs');
      });
    });
  });
}