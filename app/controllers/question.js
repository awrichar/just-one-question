var express = require('express');
var bodyParser = require('body-parser');
var email = require('../helpers/email');
var questionModel = require('../models/question');
var responseModel = require('../models/response');
var questionForm = require('../forms/question');
var userModel = require('../models/user');
var error = require('../helpers/error');
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

    var prefix = webhook.getPrefix(id),
      subject = prefix + ' ' + params.question,
      body = 'You\'ve been asked a question by ' + params.email + ':\n' + params.question + '\n\n' +
        params.choicesNumbered.join('\n') +
        '\n\nPlease respond to this email with a single number indicating your choice.';

    email.send(params.email, params.recipients, subject, body, function(err) {
      if (err) return error.response(response, 'Error sending email', err);

      webhook.createHook(request, id, function(err) {
        if (err) return error.response(response, 'Error creating email hook', err);
        response.render('success.ejs');
      });
    });
  });
}