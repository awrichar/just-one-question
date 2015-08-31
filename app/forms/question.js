var forms = require('forms');
var fields = forms.fields;
var widgets = forms.widgets;
var validators = forms.validators;
var questions = require('../helpers/question');
var formHelper = require('../helpers/forms');

module.exports = function(options) {
  var formFields = {};
  var question = questions.getRandomQuestion();

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
    validators: [formHelper.emailListValidator()],
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
    validators: [formHelper.minChoicesValidator()],
    widget: widgets.textarea({
      placeholder: question[1],
      rows: 6,
      classes: ['input-lg'],
    }),
  });

  return forms.create(formFields, { validatePastFirstError: true });
};