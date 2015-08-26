var forms = require('forms');
var fields = forms.fields;
var widgets = forms.widgets;

module.exports = function(options) {
  var formFields = {};

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
      placeholder: 'Your recipients',
      classes: ['input-lg'],
    }),
  });

  formFields['question'] = fields.string({
    required: true,
    errorAfterField: true,
    widget: widgets.text({
      placeholder: 'Your question',
      classes: ['input-lg'],
    }),
  });

  formFields['choices'] = fields.string({
    required: true,
    errorAfterField: true,
    widget: widgets.textarea({
      placeholder: 'Your answer choices (one per line)',
      rows: 6,
      classes: ['input-lg'],
    }),
  });

  return forms.create(formFields, { validatePastFirstError: true });
};