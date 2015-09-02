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
  var form = questionForm({hideEmail: hideEmail});

  if (request.body.action == 'Edit') {
    renderEditForm(form.bind(request.body), response);
  } else {
    form.handle(request, {
      success: function(form) {
        checkPreviewForm(request, response);
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

function renderEditForm(form, response) {
  form.html = form.toHTML(forms.bootstrapField);
  response.render('index.ejs', {form: form});
}

exports.renderEditForm = renderEditForm;

function renderPreviewForm(request, response, step) {
  var params = helper.getQuestionParams(request);
  params['step'] = step;
  response.render('preview.ejs', params);
}

function checkPreviewForm(request, response) {
  var step = request.body.step;

  if (step == 'register') {
    createUser(request, request.body.email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error creating user', err);
      auth.setUser(request, response, user, function(err) {
        if (err) return error.response(response, 'Error logging in', err);
        moveToNextStep(request, response);
      });
    });
  } else if (step == 'confirm' && request.user) {
    userModel.confirm(request.user.username, request.body.code, function(err, success) {
      if (err) return error.response(response, 'Error confirming user', err);
      if (success) request.user.confirmation_code = null;
      moveToNextStep(request, response);
    });
  } else if (step == 'login') {
    auth.checkAndLogin(request, response, request.body.email, request.body.password, function(err, user) {
      if (err) return error.response(response, 'Error logging in', err);
      moveToNextStep(request, response);
    });
  } else {
    moveToNextStep(request, response);
  }
}

function moveToNextStep(request, response) {
  if (request.user) {
    var forcePreview = (request.body.step == 'validate');

    if (request.user.confirmation_code) return renderPreviewForm(request, response, 'confirm');
    if (forcePreview) return renderPreviewForm(request, response);
    return sendQuestion(request, response);
  }

  userModel.get(request.body.email, function(err, user) {
    if (err) return error.response(response, 'Error looking up user', err);
    if (user) return renderPreviewForm(request, response, 'login');
    renderPreviewForm(request, response, 'register');
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

function sendQuestion(request, response) {
  var params = helper.getQuestionParams(request);

  createQuestion(request.user.id, params.recipients, params.question, params.choicesSplit, function(err, id) {
    if (err) return error.response(response, 'Error inserting into database', err);

    var prefix = webhook.getPrefix(id),
      subject = prefix + ' ' + params.question;

    email.send({
        fromName: params.email,
        bcc: params.recipients,
        subject: subject,
        htmlTemplate: 'app/views/emails/question.ejs',
        textTemplate: 'app/views/emails/question.txt',
        templateOptions: {
          email: params.email,
          question: params.question,
          choices: params.choicesSplit,
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