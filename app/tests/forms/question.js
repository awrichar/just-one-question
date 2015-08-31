var assert = require('assert');
var questionForm = require('../../forms/question');

function getFormErrors(form, data, callback) {
  form.handle(data, {
    success: function(form) {
      callback(null);
    },
    error: function(form) {
      var fields = form.fields;
      var errors = {};

      for (var key in fields) {
        var val = fields[key];
        if (val.error) errors[key] = val.error;
      }

      callback(errors);
    },
    empty: function(form) {
      assert.fail('empty', 'success', 'form is non-empty');
    }
  });
}

describe('Question form', function(){
  var goodData;

  beforeEach(function() {
    goodData = {
      email: 'foo@bar.com',
      recipients: 'alpha@beta.com',
      question: 'Test question',
      choices: 'Choice 1\nChoice 2',
    };
  });

  it('should parse valid form with 1 recipient', function(done) {
    getFormErrors(questionForm(), goodData, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should parse valid form with 2 recipients', function(done) {
    goodData.recipients += ',herp@derp.com'
    getFormErrors(questionForm(), goodData, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should fail on missing email', function(done) {
    goodData.email = '';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {email: 'Email is required.'});
      done();
    });
  });

  it('should fail on invalid email', function(done) {
    goodData.email = 'foo';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {email: 'Please enter a valid email address.'});
      done();
    });
  });

  it('should fail on missing recipients', function(done) {
    goodData.recipients = '';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {recipients: 'Recipients is required.'});
      done();
    });
  });

  it('should fail on invalid recipients', function(done) {
    goodData.recipients += ' herp@derp.com';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {recipients: 'Please enter a list of email addresses separated by commas.'});
      done();
    });
  });

  it('should fail on missing question', function(done) {
    goodData.question = '';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {question: 'Question is required.'});
      done();
    });
  });

  it('should fail on missing choices', function(done) {
    goodData.choices = '';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {choices: 'Choices is required.'});
      done();
    });
  });

  it('should fail on less than 2 choices', function(done) {
    goodData.choices = 'Choice 1';
    getFormErrors(questionForm(), goodData, function(err) {
      assert.deepEqual(err, {choices: 'You must enter at least 2 choices.'});
      done();
    });
  });
});