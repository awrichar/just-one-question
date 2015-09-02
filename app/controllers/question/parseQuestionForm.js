var email = require('../../helpers/email');
var questionModel = require('../../models/question');
var responseModel = require('../../models/response');
var questionForm = require('../../forms/question');
var userModel = require('../../models/user');
var error = require('../../helpers/error');
var auth = require('../../helpers/auth');
var webhook = require('../../helpers/webhook');
var uriHelper = require('../../helpers/uri');
var helper = require('../../helpers/question');
var forms = require('../../helpers/forms');

exports = module.exports = function (request, response) {
  var hideEmail = request.user ? true : false;
  var form = questionForm({ hideEmail: hideEmail });

  if (request.body.action == 'Edit') {
    renderEditForm(form.bind(request.body), response);
  } else {
    form.handle(request, {
      success: function(form) {
        checkPreviewForm(form, request, response);
      },
      error: function(form) {
        renderEditForm(form, response);
      },
      empty: function(form) {
        renderEditForm(form, response);
      }
    });
  }
};

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

var renderEditForm = exports.renderEditForm = function(form, response) {
  form.html = form.toHTML(forms.bootstrapField);
  response.render('index.ejs', {form: form});
}

function renderPreviewForm(email, form, response, step) {
  response.render('preview.ejs', {
    email: email,
    form: form,
    step: step,
    choicesSplit: helper.splitChoices(form.fields.choices.data),
  });
}

function checkPreviewForm(form, request, response) {
  var step = request.body.step;

  if (step == 'register') {
    createUser(request, request.body.email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error creating user', err);
      auth.setUser(request, response, user, function(err) {
        if (err) return error.response(response, 'Error logging in', err);
        moveToNextStep(form, request, response);
      });
    });
  } else if (step == 'confirm' && request.user) {
    userModel.confirm(request.user.username, request.body.code, function(err, success) {
      if (err) return error.response(response, 'Error confirming user', err);
      if (success) request.user.confirmation_code = null;
      moveToNextStep(form, request, response);
    });
  } else if (step == 'login') {
    auth.checkAndLogin(request, response, request.body.email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error logging in', err);
      moveToNextStep(form, request, response);
    });
  } else {
    moveToNextStep(form, request, response);
  }
}

function moveToNextStep(form, request, response) {
  var email;

  if (request.user) {
    var forcePreview = (request.body.step == 'validate');
    email = request.user.username;

    if (request.user.confirmation_code) return renderPreviewForm(email, form, response, 'confirm');
    if (forcePreview) return renderPreviewForm(email, form, response);
    return sendQuestion(form, request, response);
  }

  email = request.body.email;
  userModel.get(email, function(err, user) {
    if (err) return error.response(response, 'Error looking up user', err);
    if (user) return renderPreviewForm(email, form, response, 'login');
    renderPreviewForm(email, form, response, 'register');
  });
}

function createUser(request, username, password, callback) {
  userModel.create(username, password, function(err, user) {
    if (err) return callback(err);
    sendConfirmation(request, username, user.confirmation_code, function(err) {
      if (err) return callback(err);
      callback(null, user);
    });
  });
}

function sendConfirmation(request, to, code, callback) {
  email.send({
      to: to,
      subject: 'Confirm your account',
      htmlTemplate: 'app/views/emails/confirm.ejs',
      textTemplate: 'app/views/emails/confirm.txt',
      templateOptions: {
        code: code,
        rootUri: uriHelper.getRootUri(request),
      },
    }, function(err) {
      if (err) return callback(err);
      callback(null);
    }
  );
}

function sendQuestion(form, request, response) {
  var recipients = form.fields.recipients.data;
  var question = form.fields.question.data;
  var choices = helper.splitChoices(form.fields.choices.data);

  createQuestion(request.user.id, recipients, question, choices, function(err, id) {
    if (err) return error.response(response, 'Error inserting into database', err);

    var prefix = webhook.getPrefix(id),
      subject = prefix + ' ' + question;

    email.send({
        fromName: request.user.username,
        bcc: recipients,
        subject: subject,
        htmlTemplate: 'app/views/emails/question.ejs',
        textTemplate: 'app/views/emails/question.txt',
        templateOptions: {
          email: request.user.username,
          question: question,
          choices: choices,
          rootUri: uriHelper.getRootUri(request),
        },
      }, function(err) {
        if (err) return error.response(response, 'Error sending email', err);

        webhook.createHook(request, id, function(err) {
          if (err) return error.response(response, 'Error creating email hook', err);
          response.render('success.ejs', {url: '/results/' + id});
        });
      }
    );
  });
}