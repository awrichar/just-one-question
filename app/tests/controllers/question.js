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
  });

  afterEach(function() {
    utils.restoreModule(questionModel);
    utils.restoreModule(responseModel);
    utils.restoreModule(userModel);
    utils.restoreModule(email);
    utils.restoreModule(webhook);
  });

  var unconfirmedUser = {
    id: 1,
    username: 'user@test.com',
    password: hash.generate('test'),
    confirmation_code: 'foo',
  };

  var confirmedUser = {
    id: 1,
    username: 'user@test.com',
    password: hash.generate('test'),
  };

  function setupRequest(options) {
    var request = {
      body: {},
      get: sinon.stub().returns(''),
      login: sinon.stub().yields(),
    };

    email.send.yields();
    webhook.createHook.yields();

    questionModel.create.yields(null, 1);
    responseModel.createMany.yields();

    if (options.hasGoodFormData) {
      request.body = {
        email: 'foo@bar.com',
        recipients: 'alpha@beta.com',
        question: 'Test question',
        choices: 'Choice 1\nChoice 2',
      };

      for (var key in request.body) {
        request[key] = request.body[key];
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
    } else {
      userModel.get.yields();
    }

    if (options.hasRegistrationData) {
      userModel.create.yields(null, unconfirmedUser);
      request.user = unconfirmedUser;
    }

    if (options.hasConfirmationData) {
      userModel.confirm.yields(null, true);
    }

    if (options.hasLoginData) {
      var user = options.userConfirmed
        ? confirmedUser
        : unconfirmedUser;

      request.body.email = user.username;
      request.body.password = 'test';
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
          assert.ok(webhook.createHook.calledOnce, 'email hook created');
        } else {
          assert.ok(!questionModel.create.called, 'no question created');
          assert.ok(!responseModel.createMany.called, 'no responses created');
          assert.ok(!webhook.createHook.called, 'no email hook created');
        }

        if (options.userRegistered) {
          assert.ok(userModel.create.calledOnce, 'user created');
        } else {
          assert.ok(!userModel.create.called, 'no user created');
        }

        if (options.questionCreated || options.userRegistered) {
          assert.ok(email.send.calledOnce, 'email sent');
        } else {
          assert.ok(!email.send.called, 'no email sent');
        }

        if (options.userRegistered || options.userLoggedIn) {
          assert.ok(request.login.calledOnce, 'user logged in');
        } else {
          assert.ok(!request.login.called, 'no user logged in');
        }

        if (options.userConfirmed) {
          assert.ok(userModel.confirm.calledOnce, 'user is confirmed');
        } else {
          assert.ok(!userModel.confirm.called, 'user is not confirmed');
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