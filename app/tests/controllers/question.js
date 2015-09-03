var assert = require('assert');
var sinon = require('sinon');
var hash = require('password-hash');
var parseQuestionForm = require('../../controllers/question/parseQuestionForm');
var questionModel = require('../../models/question');
var responseModel = require('../../models/response');
var userModel = require('../../models/user');
var email = require('../../helpers/email');
var webhook = require('../../helpers/webhook');
var utils = require('../utils');

describe('Question controller', function() {
  beforeEach(function() {
    utils.stubModule(questionModel);
    utils.stubModule(responseModel);
    utils.stubModule(userModel);
    utils.stubModule(email);
    utils.stubModule(webhook);

    email.send.yields();
    webhook.createHook.yields();
    webhook.getPrefix.returns(questionPrefix);

    userModel.get.yields();
    userModel.create.yields(null, unconfirmedUser);
    userModel.confirm.yields(null, true);
    questionModel.create.yields(null, questionId);
    responseModel.createMany.yields();
  });

  afterEach(function() {
    utils.restoreModule(questionModel);
    utils.restoreModule(responseModel);
    utils.restoreModule(userModel);
    utils.restoreModule(email);
    utils.restoreModule(webhook);
  });

  var hostname = 'testhost';
  var questionId = 42;
  var questionPrefix = '[Q42]';
  var userPassword = 'test';

  var unconfirmedUser = {
    id: 1,
    username: 'user@test.com',
    password: hash.generate(userPassword),
    confirmation_code: 'foo',
  };

  var confirmedUser = {
    id: 1,
    username: 'user@test.com',
    password: hash.generate(userPassword),
  };

  var goodData = {
    email: 'user@test.com',
    recipients: 'alpha@beta.com',
    question: 'Test question',
    choices: 'Choice 1\nChoice 2',
  };

  var confirmationEmailParams = {
    to: unconfirmedUser.username,
    subject: 'Confirm your account',
    htmlTemplate: 'app/views/emails/confirm.ejs',
    textTemplate: 'app/views/emails/confirm.txt',
    templateOptions: {
      code: unconfirmedUser.confirmation_code,
      rootUri: 'http://' + hostname,
    },
  };

  var questionEmailParams = {
    fromName: goodData.email,
    bcc: goodData.recipients,
    subject: questionPrefix + ' ' + goodData.question,
    htmlTemplate: 'app/views/emails/question.ejs',
    textTemplate: 'app/views/emails/question.txt',
    templateOptions: {
      email: goodData.email,
      question: goodData.question,
      choices: goodData.choices.split('\n'),
      rootUri: 'http://' + hostname,
    },
  };

  function setupRequest(options) {
    var request = {
      body: {},
      protocol: 'http',
      get: sinon.stub().withArgs('host').returns(hostname),
      login: sinon.stub().yields(),
    };

    if (options.hasGoodFormData) {
      for (var key in goodData) {
        request.body[key] = goodData[key];
        request[key] = goodData[key];
      }
    }

    if (options.editButtonPressed) {
      request.body.action = 'Edit';
    }

    if (options.step) {
      request.body.step = options.step;
    }

    if (options.userExists) {
      var user = (options.userConfirmed || options.hasConfirmationData)
        ? confirmedUser
        : unconfirmedUser;

      userModel.get.yields(null, user);
      if (options.userLoggedIn) request.user = user;
    } else if (options.userConfirmed) {
      assert.fail(options.userConfirmed, false, 'invalid state: user is confirmed but does not exist');
    } else if (options.userLoggedIn) {
      assert.fail(options.userLoggedIn, false, 'invalid state: user is logged in but does not exist');
    }

    if (options.hasRegistrationData) {
      request.body.email = unconfirmedUser.username;
      request.body.password = userPassword;
      request.user = unconfirmedUser;
    }

    if (options.hasConfirmationData) {
      request.body.code = unconfirmedUser.confirmation_code;
    }

    if (options.hasLoginData) {
      var user = options.userConfirmed
        ? confirmedUser
        : unconfirmedUser;

      request.body.email = user.username;
      request.body.password = userPassword;
      request.user = user;
    }

    return request;
  }

  function verifyController(request, options, done) {
    var response = {
      locals: {},
      render: function(template, params) {
        assert.equal(template, options.template, 'correct template is rendered');

        if (options.step) {
          assert.equal(params.step, options.step, 'correct step is triggered');
        } else {
          assert.ok(!params || !params.step, 'no step is triggered');
        }

        if (options.formHasErrors) {
          assert.ok(!params.form.isValid(), 'form parses with errors');
        } else {
          assert.ok(!params || !params.form || params.form.isValid(), 'form has no errors');
        }

        if (options.questionCreated) {
          assert.ok(questionModel.create.calledOnce, 'question created');
          assert.ok(responseModel.createMany.calledOnce, 'responses created');
          assert.ok(webhook.createHook.calledOnce, 'web hook created');

          assert.ok(questionModel.create.calledWith(confirmedUser.id,
            goodData.recipients, goodData.question), 'question data is correct');
          assert.ok(responseModel.createMany.calledWith(questionId,
            goodData.choices.split('\n')), 'response data is correct');
          assert.ok(webhook.createHook.calledWith(request, questionId), 'web hook data is correct');
        } else {
          assert.ok(!questionModel.create.called, 'no question created');
          assert.ok(!responseModel.createMany.called, 'no responses created');
          assert.ok(!webhook.createHook.called, 'no email hook created');
        }

        if (options.userRegistered) {
          assert.ok(userModel.create.calledOnce, 'user created');
          assert.ok(userModel.create.calledWith(options.whichUser.username,
            userPassword), 'correct user created');
        } else {
          assert.ok(!userModel.create.called, 'no user created');
        }

        if (options.userRegistered) {
          assert.ok(email.send.calledOnce, 'one email sent');
          assert.ok(email.send.calledWith(confirmationEmailParams), 'confirmation email sent');
        } else if (options.questionCreated) {
          assert.ok(email.send.calledOnce, 'one email sent');
          assert.ok(email.send.calledWith(questionEmailParams), 'question email sent');
        } else {
          assert.ok(!email.send.called, 'no email sent');
        }

        if (options.userRegistered || options.userLoggedIn) {
          assert.ok(request.login.calledOnce, 'login called once');
          assert.ok(request.login.calledWith(options.whichUser), 'correct user logged in');
        } else {
          assert.ok(!request.login.called, 'login never called');
        }

        if (options.userConfirmed) {
          assert.ok(userModel.confirm.calledOnce, 'confirm called once');
          assert.ok(userModel.confirm.calledWith(unconfirmedUser.username,
            unconfirmedUser.confirmation_code), 'correct user is confirmed');
        } else {
          assert.ok(!userModel.confirm.called, 'confirm never called');
        }

        done();
      },
    };

    parseQuestionForm(request, response);
  }

  it('should render form when Edit is pressed', function(done) {
    var request = setupRequest({
      editButtonPressed: true,
    });

    verifyController(request, {
      template: 'index.ejs',
    }, done);
  });

  it('should show errors when invalid data is submitted', function(done) {
    var request = setupRequest({
      step: 'validate',
    });

    verifyController(request, {
      template: 'index.ejs',
      formHasErrors: true,
    }, done);
  });

  it('should ask non-user to register', function(done) {
    var request = setupRequest({
      step: 'validate',
      hasGoodFormData: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
      step: 'register',
    }, done);
  });

  it('should ask known user to login', function(done) {
    var request = setupRequest({
      step: 'validate',
      hasGoodFormData: true,
      userExists: true,
      userConfirmed: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
      step: 'login',
    }, done);
  });

  it('should ask unconfirmed user to confirm', function(done) {
    var request = setupRequest({
      step: 'validate',
      hasGoodFormData: true,
      userExists: true,
      userConfirmed: false,
      userLoggedIn: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
      step: 'confirm',
    }, done);
  });

  it('should show preview for normal user', function(done) {
    var request = setupRequest({
      step: 'validate',
      hasGoodFormData: true,
      userExists: true,
      userConfirmed: true,
      userLoggedIn: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
    }, done);
  });

  it('should register new user', function(done) {
    var request = setupRequest({
      step: 'register',
      hasGoodFormData: true,
      userExists: false,
      hasRegistrationData: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
      step: 'confirm',
      userRegistered: true,
      whichUser: unconfirmedUser,
    }, done);
  });

  it('should login user and ask to confirm', function(done) {
    var request = setupRequest({
      step: 'login',
      hasGoodFormData: true,
      userExists: true,
      hasLoginData: true,
    });

    verifyController(request, {
      template: 'preview.ejs',
      step: 'confirm',
      userLoggedIn: true,
      whichUser: unconfirmedUser,
    }, done);
  });

  it('should confirm user and send question', function(done) {
    var request = setupRequest({
      step: 'confirm',
      hasGoodFormData: true,
      userExists: true,
      userLoggedIn: true,
      hasConfirmationData: true,
    });

    verifyController(request, {
      template: 'success.ejs',
      userConfirmed: true,
      questionCreated: true,
    }, done);
  });

  it('should login user and send question', function(done) {
    var request = setupRequest({
      step: 'login',
      hasGoodFormData: true,
      userExists: true,
      userConfirmed: true,
      hasLoginData: true,
    });

    verifyController(request, {
      template: 'success.ejs',
      userLoggedIn: true,
      whichUser: confirmedUser,
      questionCreated: true,
    }, done);
  });

  it('should send question for logged in user', function(done) {
    var request = setupRequest({
      hasGoodFormData: true,
      userExists: true,
      userConfirmed: true,
      userLoggedIn: true,
    });

    verifyController(request, {
      template: 'success.ejs',
      questionCreated: true,
    }, done);
  });
});