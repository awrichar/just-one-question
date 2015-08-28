var forms = require('forms');
var fields = forms.fields;
var widgets = forms.widgets;
var validators = forms.validators;
var questions = require('../helpers/random_questions.js');

// regular expression by Scott Gonzalez:
// http://projects.scottsplayground.com/email_address_validation/
var emailRegex = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;

function rand(max) {
  return Math.floor(Math.random() * max);
}

function emailListValidator(message) {
    var msg = message || 'Please enter a list of email addresses separated by commas.';
    return function (form, field, callback) {
      var pieces = field.data.split(/\s*,\s*/);
      for (var i=0; i<pieces.length; i++) {
        if (!emailRegex.test(pieces[i])) {
          return callback(msg);
        }
      }

      callback();
    };
};

module.exports = function(options) {
  var formFields = {};
  var question = questions[rand(questions.length)];

  if (!options || !options.hideEmail) {
    formFields['email'] = fields.string({
      required: true,
      errorAfterField: true,
      validators: [validators.email()],
      widget: widgets.text({
        placeholder: 'Your email',
        classes: ['input-lg'],
      }),
    });
  }

  formFields['recipients'] = fields.string({
    required: true,
    errorAfterField: true,
    validators: [emailListValidator()],
    widget: widgets.text({
      placeholder: 'Recipient emails',
      classes: ['input-lg'],
    }),
  });

  formFields['question'] = fields.string({
    required: true,
    errorAfterField: true,
    widget: widgets.text({
      placeholder: question[0],
      classes: ['input-lg'],
    }),
  });

  formFields['choices'] = fields.string({
    required: true,
    errorAfterField: true,
    widget: widgets.textarea({
      placeholder: question[1],
      rows: 6,
      classes: ['input-lg'],
    }),
  });

  return forms.create(formFields, { validatePastFirstError: true });
};