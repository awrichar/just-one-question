var forms = require('forms');
var fields = forms.fields;
var widgets = forms.widgets;
var questions = require('../helpers/random_questions.js');

function rand(max) {
  return Math.floor(Math.random() * max);
}

module.exports = function(options) {
  var formFields = {};
  var question = questions[rand(questions.length)];

  if (!options || !options.hideEmail) {
    formFields['email'] = fields.string({
      required: true,
      errorAfterField: true,
      widget: widgets.text({
        placeholder: 'Your email',
        classes: ['input-lg'],
      }),
    });
  }

  formFields['recipients'] = fields.string({
    required: true,
    errorAfterField: true,
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